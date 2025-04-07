const http = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

const server = http.createServer((req, res) => {
  const sendJSON = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  const dbFile = '/uploads/db.json';
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({ users: [], videos: [], votes: [] }));
  }
  const db = JSON.parse(fs.readFileSync(dbFile));

  if (req.url.startsWith('/public') || req.url === '/') {
    const filePath = req.url === '/' ? 'public/index.html' : `.${req.url}`;
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.jpg': 'image/jpeg'
    }[ext] || 'text/plain';
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Arquivo não encontrado');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
    return;
  }

  if (req.url.startsWith('/uploads')) {
    const filePath = `.${req.url}`;
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Arquivo não encontrado');
      } else {
        res.writeHead(200, { 'Content-Type': path.extname(filePath) === '.jpg' ? 'image/jpeg' : 'video/mp4' });
        res.end(content);
      }
    });
    return;
  }

  if (req.url === '/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { email, username, over18 } = JSON.parse(body);
      if (!over18) return sendJSON({ error: 'Você precisa ter mais de 18 anos' }, 403);
      if (!email || !username) return sendJSON({ error: 'Email e nome de usuário são obrigatórios' }, 400);

      let user = db.users.find(u => u.email === email);
      if (!user) {
        user = { id: db.users.length + 1, email, username, photo: '' };
        db.users.push(user);
        fs.writeFileSync(dbFile, JSON.stringify(db));
      } else {
        user.username = username;
        fs.writeFileSync(dbFile, JSON.stringify(db));
      }
      sendJSON(user);
    });
    return;
  }

  if (req.url === '/upload' && req.method === 'POST') {
    console.log('Recebendo upload...');
    const form = formidable({
      const form = formidable({
  uploadDir: '/uploads',
  keepExtensions: true,
  maxFileSize: 50 * 1024 * 1024
});
    form.parse(req, (err, fields, files) => {
      if (err) {
        console.log('Erro no formidable:', err.message);
        return sendJSON({ error: 'Erro no upload: ' + err.message }, 500);
      }
      const title = fields.title;
      const user_id = parseInt(fields.user_id);
      const videoFile = files.video ? files.video.newFilename : null;
      const thumbFile = files.thumbnail ? files.thumbnail.newFilename : null;

      if (!title || !user_id || !videoFile || !thumbFile) {
        console.log('Faltam dados no upload');
        return sendJSON({ error: 'Faltam dados: título, user_id, vídeo ou miniatura' }, 400);
      }

      const video = {
        id: db.videos.length + 1,
        title,
        thumbnail: thumbFile,
        file: videoFile,
        user_id,
        views: 0,
        likes: 0,
        dislikes: 0
      };
      db.videos.push(video);
      fs.writeFileSync(dbFile, JSON.stringify(db));
      console.log('Vídeo salvo:', video);
      sendJSON({ message: 'Vídeo enviado com sucesso' });
    });
    return;
  }

  if (req.url === '/upload-photo' && req.method === 'POST') {
    const form = formidable({
      uploadDir: '/uploads',
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024
    });
    form.parse(req, (err, fields, files) => {
      if (err) return sendJSON({ error: 'Erro no upload: ' + err.message }, 500);
      const user_id = parseInt(fields.user_id);
      const photoFile = files.photo ? files.photo.newFilename : null;

      if (!user_id || !photoFile) return sendJSON({ error: 'Faltam dados' }, 400);
      const user = db.users.find(u => u.id === user_id);
      if (user) {
        user.photo = photoFile;
        fs.writeFileSync(dbFile, JSON.stringify(db));
        sendJSON({ message: 'Foto atualizada', photo: photoFile });
      } else {
        sendJSON({ error: 'Usuário não encontrado' }, 404);
      }
    });
    return;
  }

  if (req.url === '/videos' && req.method === 'GET') {
    const videos = db.videos.map(v => ({
      ...v,
      username: db.users.find(u => u.id === v.user_id)?.username,
      userPhoto: db.users.find(u => u.id === v.user_id)?.photo || ''
    }));
    sendJSON(videos);
    return;
  }

  if (req.url.startsWith('/search') && req.method === 'GET') {
    const query = new URL(req.url, 'http://localhost').searchParams.get('q')?.toLowerCase() || '';
    const videos = db.videos.filter(v => v.title.toLowerCase().includes(query)).map(v => ({
      ...v,
      username: db.users.find(u => u.id === v.user_id)?.username,
      userPhoto: db.users.find(u => u.id === v.user_id)?.photo || ''
    }));
    sendJSON(videos);
    return;
  }

  if (req.url.startsWith('/vote') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { videoId, userId, value } = JSON.parse(body);
      const video = db.videos.find(v => v.id === videoId);
      if (!video) return sendJSON({ error: 'Vídeo não encontrado' }, 404);

      const existingVote = db.votes.find(v => v.videoId === videoId && v.userId === userId);

      if (value === 0) {
        if (existingVote) {
          db.votes = db.votes.filter(v => v !== existingVote);
          if (existingVote.value === 1) video.likes--;
          else if (existingVote.value === -1) video.dislikes--;
        }
      } else if (existingVote) {
        if (existingVote.value !== value) {
          if (value === 1) {
            video.dislikes--;
            video.likes++;
          } else if (value === -1) {
            video.likes--;
            video.dislikes++;
          }
          existingVote.value = value;
        }
      } else {
        db.votes.push({ videoId, userId, value });
        if (value === 1) video.likes++;
        else if (value === -1) video.dislikes++;
      }

      fs.writeFileSync(dbFile, JSON.stringify(db));
      console.log(`Voto processado: videoId=${videoId}, userId=${userId}, value=${value}, likes=${video.likes}, dislikes=${video.dislikes}`);
      sendJSON({ likes: video.likes, dislikes: video.dislikes });
    });
    return;
  }

  if (req.url.startsWith('/view') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { videoId } = JSON.parse(body);
      const video = db.videos.find(v => v.id === videoId);
      if (video) {
        video.views++;
        fs.writeFileSync(dbFile, JSON.stringify(db));
        sendJSON({ views: video.views });
      } else {
        sendJSON({ error: 'Vídeo não encontrado' }, 404);
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Rota não encontrada');
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Servidor rodando na porta 3000');
});

process.on('uncaughtException', (err) => {
  console.log('Erro não tratado:', err.message);
});
