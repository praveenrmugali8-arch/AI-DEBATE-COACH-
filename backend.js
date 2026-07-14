// Install: npm i express cors dotenv pg bcryptjs jsonwebtoken
// Run: DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/debate_coach JWT_SECRET=change-me node backend.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET must be set.");
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

function tokenFor(user) { return jwt.sign({ id: user.id, role: user.role }, secret, { expiresIn: "7d" }); }
function publicUser(row) { return { id: row.id, name: row.name, email: row.email, role: row.role }; }
function requireAuth(req, res, next) { try { req.user = jwt.verify((req.headers.authorization || "").replace("Bearer ", ""), secret); next(); } catch { res.status(401).json({ message: "Please sign in again." }); } }
function bad(res, message) { return res.status(400).json({ message }); }

app.post("/api/auth/register", async (req, res, next) => {
  try { const { name, email, password, role = "student" } = req.body; if (!name || !email || !password || password.length < 6) return bad(res, "Name, email and a 6+ character password are required."); if (!['student','educator','hoster'].includes(role)) return bad(res, "Invalid role.");
    const result = await db.query("INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role", [name.trim(), email.trim().toLowerCase(), await bcrypt.hash(password, 12), role]); const user = result.rows[0]; res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (err) { if (err.code === "23505") return bad(res, "That email is already registered."); next(err); }
});
app.post("/api/auth/login", async (req, res, next) => { try { const result = await db.query("SELECT * FROM users WHERE email=$1", [String(req.body.email || "").toLowerCase()]); const user = result.rows[0]; if (!user || !await bcrypt.compare(req.body.password || "", user.password_hash)) return res.status(401).json({ message: "Invalid email or password." }); res.json({ token: tokenFor(user), user: publicUser(user) }); } catch (err) { next(err); } });

app.get("/api/debates", requireAuth, async (req, res, next) => { try { const { rows } = await db.query("SELECT id,topic,format,status,created_at FROM debates WHERE created_by=$1 OR id IN (SELECT debate_id FROM debate_participants WHERE user_id=$1) ORDER BY created_at DESC", [req.user.id]); res.json(rows); } catch (err) { next(err); } });
app.post("/api/debates", requireAuth, async (req, res, next) => { const client = await db.connect(); try { const { topic, format, speakers = [] } = req.body; if (!topic || !format || !Array.isArray(speakers) || speakers.length < 2) return bad(res, "Topic, format and at least two speakers are required."); await client.query("BEGIN"); const debate = (await client.query("INSERT INTO debates (topic,format,created_by) VALUES ($1,$2,$3) RETURNING *", [topic.trim(), format.trim(), req.user.id])).rows[0]; for (let i=0;i<speakers.length;i++) { const s=speakers[i]; await client.query("INSERT INTO speakers (debate_id,name,side,minutes,turn_order) VALUES ($1,$2,$3,$4,$5)", [debate.id, s.name, s.side, Number(s.minutes) || 3, i]); } await client.query("COMMIT"); const speakersResult = await client.query("SELECT * FROM speakers WHERE debate_id=$1 ORDER BY turn_order", [debate.id]); res.status(201).json({ ...debate, speakers: speakersResult.rows }); } catch (err) { await client.query("ROLLBACK"); next(err); } finally { client.release(); } });
app.get("/api/debates/:id", requireAuth, async (req,res,next) => { try { const debate=(await db.query("SELECT * FROM debates WHERE id=$1",[req.params.id])).rows[0]; if(!debate) return res.status(404).json({message:"Debate not found."}); const speakers=(await db.query("SELECT * FROM speakers WHERE debate_id=$1 ORDER BY turn_order",[debate.id])).rows; res.json({...debate,speakers}); }catch(err){next(err);} });
app.patch("/api/debates/:id/end", requireAuth, async (req,res,next) => { try { const result=await db.query("UPDATE debates SET status='ended', ended_at=NOW() WHERE id=$1 AND created_by=$2 RETURNING *",[req.params.id,req.user.id]); if(!result.rows[0]) return res.status(403).json({message:"Only the host can end this debate."}); res.json(result.rows[0]); }catch(err){next(err);} });
app.get("/api/debates/:id/messages", requireAuth, async (req,res,next) => { try { const {rows}=await db.query("SELECT m.id,m.body,m.created_at,u.name AS author_name FROM messages m JOIN users u ON u.id=m.user_id WHERE m.debate_id=$1 ORDER BY m.created_at",[req.params.id]); res.json(rows); }catch(err){next(err);} });
app.post("/api/debates/:id/messages", requireAuth, async (req,res,next) => { try { if(!String(req.body.body||"").trim()) return bad(res,"Message cannot be empty."); const {rows}=await db.query("WITH inserted AS (INSERT INTO messages (debate_id,user_id,body) VALUES ($1,$2,$3) RETURNING *) SELECT inserted.id,inserted.body,inserted.created_at,users.name AS author_name FROM inserted JOIN users ON users.id=inserted.user_id",[req.params.id,req.user.id,req.body.body.trim()]); res.status(201).json(rows[0]); }catch(err){next(err);} });
app.get("/api/debates/:id/notes", requireAuth, async (req,res,next) => { try { const {rows}=await db.query("SELECT n.id,n.body,n.created_at,s.name AS speaker_name FROM host_notes n LEFT JOIN speakers s ON s.id=n.speaker_id WHERE n.debate_id=$1 AND n.user_id=$2 ORDER BY n.created_at DESC",[req.params.id,req.user.id]);res.json(rows);}catch(err){next(err);} });
app.post("/api/debates/:id/notes", requireAuth, async (req,res,next) => { try { if(!String(req.body.body||"").trim()) return bad(res,"Note cannot be empty."); const {rows}=await db.query("WITH inserted AS (INSERT INTO host_notes (debate_id,user_id,speaker_id,body) VALUES ($1,$2,$3,$4) RETURNING *) SELECT inserted.id,inserted.body,inserted.created_at,speakers.name AS speaker_name FROM inserted LEFT JOIN speakers ON speakers.id=inserted.speaker_id",[req.params.id,req.user.id,req.body.speakerId||null,req.body.body.trim()]);res.status(201).json(rows[0]);}catch(err){next(err);} });
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({message:"Internal server error."});});
if (require.main === module) {
  app.listen(process.env.PORT || 4000, () => console.log("API running on port 4000"));
}
module.exports = app;
