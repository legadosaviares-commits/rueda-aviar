const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-change-me';
const DB_PATH = process.env.DB_PATH || './data/agenda.db';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER' CHECK(role IN ('USER','SUPER_ADMIN')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS editions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS activation_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  edition_id INTEGER NOT NULL,
  code_cipher TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'unused' CHECK(status IN ('unused','activated','revoked')),
  user_id INTEGER,
  activated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(edition_id) REFERENCES editions(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS experiences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  edition_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(edition_id) REFERENCES editions(id)
);
CREATE TABLE IF NOT EXISTS private_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experience_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(experience_id) REFERENCES experiences(id)
);
CREATE TABLE IF NOT EXISTS admin_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const encKey = crypto.createHash('sha256').update(JWT_SECRET).digest();
function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}
function decrypt(value) {
  const [iv, tag, data] = value.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
function makeCode() {
  return crypto.randomBytes(12).toString('base64url').toUpperCase();
}
function hashCode(code) { return crypto.createHash('sha256').update(code).digest('hex'); }
function sign(user) { return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' }); }
function auth(req, res, next) {
  try {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: 'Autenticación requerida' });
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id,email,role,active FROM users WHERE id=?').get(payload.sub);
    if (!user || !user.active) return res.status(401).json({ error: 'Sesión no válida' });
    req.user = user;
    next();
  } catch { return res.status(401).json({ error: 'Sesión no válida' }); }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Acceso administrativo requerido' });
  next();
}
function logAdmin(event, metadata={}) { db.prepare('INSERT INTO admin_events(event,metadata) VALUES(?,?)').run(event, JSON.stringify(metadata)); }

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Public entry point used by the single QR printed in the agendas.
app.get('/acceso', (req,res) => res.sendFile(path.join(__dirname,'public','index.html')));

app.post('/api/auth/register', (req,res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || password.length < 8) return res.status(400).json({error:'Correo y contraseña válida requeridos'});
  try {
    const hash = bcrypt.hashSync(password, 12);
    const result = db.prepare('INSERT INTO users(email,password_hash) VALUES(?,?)').run(email,hash);
    const user = db.prepare('SELECT id,email,role,active FROM users WHERE id=?').get(result.lastInsertRowid);
    res.cookie('session', sign(user), {httpOnly:true, sameSite:'lax', secure:process.env.NODE_ENV==='production', maxAge:7*24*60*60*1000});
    res.json({user});
  } catch { res.status(409).json({error:'La cuenta ya existe'}); }
});

app.post('/api/auth/login', (req,res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT id,email,password_hash,role,active FROM users WHERE email=?').get(email);
  if (!user || !user.active || !bcrypt.compareSync(password,user.password_hash)) return res.status(401).json({error:'Credenciales no válidas'});
  res.cookie('session', sign(user), {httpOnly:true, sameSite:'lax', secure:process.env.NODE_ENV==='production', maxAge:7*24*60*60*1000});
  res.json({user:{id:user.id,email:user.email,role:user.role}});
});

app.post('/api/auth/logout',(req,res)=>{res.clearCookie('session');res.json({ok:true});});
app.get('/api/me',auth,(req,res)=>res.json({user:req.user}));

// User activation: the code is consumed atomically and can never activate another account later.
app.post('/api/activation/redeem',auth,(req,res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!code || code.length < 10) return res.status(400).json({error:'Código de activación no válido'});
  const row = db.prepare(`SELECT id,edition_id,status FROM activation_codes WHERE code_hash=?`).get(hashCode(code));
  if (!row || row.status !== 'unused') return res.status(400).json({error:'Código inválido o ya utilizado'});
  const existing = db.prepare('SELECT id FROM experiences WHERE user_id=?').get(req.user.id);
  if (existing) return res.status(409).json({error:'Esta cuenta ya tiene una agenda activada'});
  const tx = db.transaction(() => {
    const changed = db.prepare(`UPDATE activation_codes SET status='activated',user_id=?,activated_at=CURRENT_TIMESTAMP WHERE id=? AND status='unused'`).run(req.user.id,row.id);
    if (changed.changes !== 1) throw new Error('RACE');
    db.prepare('INSERT INTO experiences(user_id,edition_id) VALUES(?,?)').run(req.user.id,row.edition_id);
  });
  try { tx(); res.json({ok:true,message:'Agenda activada'}); } catch { res.status(409).json({error:'No fue posible activar el código'}); }
});

app.get('/api/experience',auth,(req,res) => {
  const experience = db.prepare('SELECT id,edition_id,created_at FROM experiences WHERE user_id=?').get(req.user.id);
  if (!experience) return res.status(404).json({error:'No hay una agenda activada'});
  // Private content is scoped by authenticated user ownership.
  const records = db.prepare('SELECT id,kind,content,created_at FROM private_records WHERE experience_id=? ORDER BY id DESC').all(experience.id);
  res.json({experience,records});
});

app.post('/api/experience/records',auth,(req,res) => {
  const experience = db.prepare('SELECT id FROM experiences WHERE user_id=?').get(req.user.id);
  if (!experience) return res.status(404).json({error:'Activa tu agenda primero'});
  const kind = String(req.body.kind || 'registro').slice(0,40);
  const content = String(req.body.content || '').trim();
  if (!content) return res.status(400).json({error:'El registro está vacío'});
  const result = db.prepare('INSERT INTO private_records(experience_id,kind,content) VALUES(?,?,?)').run(experience.id,kind,content);
  res.json({id:result.lastInsertRowid,ok:true});
});

// --- Super Admin: metadata only. No endpoint exposes private_records. ---
app.post('/api/admin/bootstrap-edition',auth,adminOnly,(req,res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({error:'Nombre de edición requerido'});
  const result = db.prepare('INSERT INTO editions(name) VALUES(?)').run(name);
  logAdmin('edition.created',{editionId:result.lastInsertRowid,name});
  res.json({id:result.lastInsertRowid,name});
});

app.get('/api/admin/dashboard',auth,adminOnly,(req,res) => {
  const users = db.prepare('SELECT COUNT(*) n FROM users WHERE role=\'USER\'').get().n;
  const activated = db.prepare("SELECT COUNT(*) n FROM activation_codes WHERE status='activated'").get().n;
  const unused = db.prepare("SELECT COUNT(*) n FROM activation_codes WHERE status='unused'").get().n;
  const editions = db.prepare('SELECT id,name,active,created_at FROM editions ORDER BY id DESC').all();
  res.json({users,activated,unused,editions});
});

app.get('/api/admin/users',auth,adminOnly,(req,res) => {
  const users = db.prepare(`SELECT id,email,role,active,created_at FROM users ORDER BY id DESC`).all();
  res.json({users});
});

app.post('/api/admin/activation-batch',auth,adminOnly,(req,res) => {
  const editionId = Number(req.body.editionId);
  const count = Math.min(Math.max(Number(req.body.count || 1),1),5000);
  if (!db.prepare('SELECT id FROM editions WHERE id=? AND active=1').get(editionId)) return res.status(400).json({error:'Edición no válida'});
  const codes=[];
  const insert=db.prepare('INSERT INTO activation_codes(edition_id,code_cipher,code_hash) VALUES(?,?,?)');
  const tx=db.transaction(()=>{for(let i=0;i<count;i++){let code,hash;do{code=makeCode();hash=hashCode(code)}while(db.prepare('SELECT id FROM activation_codes WHERE code_hash=?').get(hash));insert.run(editionId,encrypt(code),hash);codes.push(code);}});
  tx();
  logAdmin('activation.batch.created',{editionId,count});
  // Codes are returned only at creation time so they can be put into the physical cards.
  res.json({editionId,count,codes});
});

app.get('/api/admin/activation-stats',auth,adminOnly,(req,res)=>{
  const rows=db.prepare(`SELECT e.id,e.name,
    SUM(CASE WHEN a.status='unused' THEN 1 ELSE 0 END) unused,
    SUM(CASE WHEN a.status='activated' THEN 1 ELSE 0 END) activated,
    SUM(CASE WHEN a.status='revoked' THEN 1 ELSE 0 END) revoked
    FROM editions e LEFT JOIN activation_codes a ON a.edition_id=e.id GROUP BY e.id ORDER BY e.id DESC`).all();
  res.json({rows});
});

app.post('/api/admin/qr',auth,adminOnly,async(req,res)=>{
  const url=`${BASE_URL}/acceso`;
  const dataUrl=await QRCode.toDataURL(url,{width:1200,margin:2,errorCorrectionLevel:'H'});
  logAdmin('qr.generated',{destination:'/acceso'});
  res.json({url,dataUrl});
});

app.post('/api/admin/cards.pdf',auth,adminOnly,async(req,res)=>{
  const editionId=Number(req.body.editionId);
  const limit=Math.min(Math.max(Number(req.body.limit||20),1),5000);
  const rows=db.prepare(`SELECT a.id,a.code_cipher,e.name FROM activation_codes a JOIN editions e ON e.id=a.edition_id WHERE a.edition_id=? AND a.status='unused' ORDER BY a.id ASC LIMIT ?`).all(editionId,limit);
  if(!rows.length) return res.status(404).json({error:'No hay códigos sin utilizar para esta edición'});
  const qrData=await QRCode.toDataURL(`${BASE_URL}/acceso`,{width:300,margin:1,errorCorrectionLevel:'H'});
  const qrBuffer=Buffer.from(qrData.split(',')[1],'base64');
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition',`attachment; filename="tarjetas-activacion-${editionId}.pdf"`);
  const doc=new PDFDocument({size:'A4',margin:36});
  doc.pipe(res);
  rows.forEach((row,i)=>{
    if(i>0 && i%8===0) doc.addPage();
    const pos=i%8;
    const x=45+(pos%2)*270, y=45+Math.floor(pos/2)*185;
    doc.roundedRect(x,y,245,160,10).stroke();
    doc.fontSize(14).text('AGENDA DE LA EXPERIENCIA',x+15,y+14,{width:215,align:'center'});
    doc.fontSize(9).text(row.name,x+15,y+38,{width:215,align:'center'});
    doc.fontSize(9).text('Activa tu acceso personal con este código.',x+15,y+55,{width:215,align:'center'});
    doc.image(qrBuffer,x+15,y+78,{width:62,height:62});
    doc.fontSize(12).text(decrypt(row.code_cipher),x+90,y+91,{width:135,align:'center'});
    doc.fontSize(7).text('Código de un solo uso. No lo compartas.',x+90,y+116,{width:135,align:'center'});
  });
  doc.end();
  logAdmin('activation.cards.generated',{editionId,count:rows.length});
});

// Bootstrap admin from environment on first run only.
(function bootstrapAdmin(){
  const email=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
  const password=String(process.env.ADMIN_PASSWORD||'');
  if(!email || password.length<8) return;
  if(!db.prepare("SELECT id FROM users WHERE role='SUPER_ADMIN' LIMIT 1").get()) {
    db.prepare('INSERT INTO users(email,password_hash,role) VALUES(?,?,\'SUPER_ADMIN\')').run(email,bcrypt.hashSync(password,12));
  }
})();

app.get('/health',(req,res)=>res.json({ok:true,service:'agenda-de-la-experiencia'}));
app.listen(PORT,()=>console.log(`Agenda de la Experiencia running on ${PORT}`));
