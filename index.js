/*
 * Lunar Shift 邮箱登录 · CloudBase 云函数（HTTP）
 * -------------------------------------------------
 * 作用：邮箱 + 密码注册/登录，绑定「同步 ID」实现跨设备账号体系。
 * 存储：COS（lunar-auth/<email>.json），密码用 scrypt 加盐哈希（安全）。
 *
 * API（POST /auth）：
 *   { action:'register', email, pwd } → { ok, syncId }
 *   { action:'login',    email, pwd } → { ok, syncId }
 *
 * 部署（命令行）：
 *   cd auth && cloudbase fn deploy auth --runtime Nodejs18.15 --force -e <环境ID>
 *   cloudbase routes add -e <环境ID> --data '{"domain":"<默认域名>","routes":[{"path":"/auth","upstreamResourceType":"SCF","upstreamResourceName":"auth"}]}'
 */
const COS = require('cos-nodejs-sdk-v5');
const crypto = require('crypto');

const Bucket = '6465-deepseek-proxy-d4g6o2cxmf70e554f-1471086786';
const Region = 'ap-shanghai';
const PREFIX = 'lunar-auth/';

function cos() {
  return new COS({
    SecretId: process.env.TENCENTCLOUD_SECRETID,
    SecretKey: process.env.TENCENTCLOUD_SECRETKEY,
    SecurityToken: process.env.TENCENTCLOUD_SESSIONTOKEN
  });
}
function keyOf(email) { return PREFIX + email.toLowerCase().trim() + '.json'; }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.main = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors(204, { ok: true });
  if (event.httpMethod !== 'POST') return cors(405, { error: 'method not allowed' });

  let body = {};
  try { body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {}); }
  catch (e) { return cors(400, { error: 'bad json body' }); }

  const action = body.action;
  const email = String(body.email || '').toLowerCase().trim().slice(0, 120);
  const pwd = String(body.pwd || '');

  if (!EMAIL_RE.test(email)) return cors(400, { error: '邮箱格式不正确' });
  if (pwd.length < 6 || pwd.length > 64) return cors(400, { error: '密码需 6-64 位' });

  const c = cos();
  try {
    if (action === 'register') {
      // 已存在则拒绝
      try { await c.getObject({ Bucket, Region, Key: keyOf(email) }); return cors(409, { error: '该邮箱已注册，请直接登录' }); }
      catch (e) { if (!(e && (e.code === 'NoSuchKey' || e.code === 'NoSuchResource'))) throw e; }

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync(pwd, salt, 64).toString('hex');
      const syncId = 'LS-' + (Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 4)).toUpperCase();
      await c.putObject({ Bucket, Region, Key: keyOf(email), Body: Buffer.from(JSON.stringify({
        email: email, salt: salt, hash: hash, syncId: syncId, createdAt: Date.now()
      }), 'utf-8') });
      return cors(200, { ok: true, syncId: syncId, email: email });
    }

    if (action === 'login') {
      let doc = null;
      try {
        const res = await c.getObject({ Bucket, Region, Key: keyOf(email) });
        doc = JSON.parse(res.Body.toString('utf-8'));
      } catch (e) {
        if (e && (e.code === 'NoSuchKey' || e.code === 'NoSuchResource')) return cors(404, { error: '该邮箱尚未注册' });
        throw e;
      }
      const calc = crypto.scryptSync(pwd, doc.salt, 64).toString('hex');
      const okLen = Buffer.byteLength(calc) === Buffer.byteLength(doc.hash) &&
        crypto.timingSafeEqual(Buffer.from(calc, 'utf-8'), Buffer.from(doc.hash, 'utf-8'));
      if (!okLen) return cors(401, { error: '密码错误' });
      return cors(200, { ok: true, syncId: doc.syncId, email: doc.email });
    }

    return cors(400, { error: 'action required (register|login)' });
  } catch (e) {
    return cors(500, { error: 'auth error: ' + (e && (e.code || e.message)) });
  }
};

function cors(status, obj) {
  const payload = JSON.stringify(obj);
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: payload,
    isBase64Encoded: false
  };
}
