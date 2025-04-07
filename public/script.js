let user = null;

function login() {
  const email = document.getElementById('email').value;
  const username = document.getElementById('username').value;
  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, over18: true })
  })
  .then(res => {
    if (!res.ok) throw new Error('Erro no login: ' + res.status);
    return res.json();
  })
  .then(data => {
    user = data;
    localStorage.setItem('user', JSON.stringify(user));
    document.getElementById('login').style.display = 'none';
    document.getElementById('main').style.display = 'block';
    document.getElementById('user-photo').src = user.photo ? `/uploads/${user.photo}` : '/public/default.jpg';
    loadVideos();
  })
  .catch(err => alert(err.message));
}

function uploadPhoto() {
  const photo = document.getElementById('photo-file').files[0];
  if (!photo) return alert('Selecione uma foto!');
  const formData = new FormData();
  formData.append('user_id', user.id);
  formData.append('photo', photo);

  fetch('/upload-photo', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    user.photo = data.photo;
    localStorage.setItem('user', JSON.stringify(user));
    document.getElementById('user-photo').src = `/uploads/${data.photo}`;
  });
}

function loadVideos() {
  fetch('/videos')
    .then(res => res.json())
    .then(videos => {
      const list = document.getElementById('video-list');
      list.innerHTML = '';
      videos.forEach(v => {
        const userVote = JSON.parse(localStorage.getItem(`vote_${v.id}_${user.id}`)) || 0;
        list.innerHTML += `
          <div class="video-item">
            <img src="/uploads/${v.thumbnail}">
            <p>${v.title}</p>
            <div class="video-info">
              <img src="${v.userPhoto ? '/uploads/' + v.userPhoto : '/public/default.jpg'}">${v.username} | 
              Visualizações: ${v.views} | 
              <span class="like">👍 ${v.likes}</span> 
              <span class="dislike">👎 ${v.dislikes}</span>
            </div>
            <button onclick="watchVideo('/uploads/${v.file}', ${v.id})">Assistir</button>
            <button onclick="downloadVideo('/uploads/${v.file}', '${v.title}')">Baixar</button>
            <button class="vote-btn ${userVote === 1 ? 'voted' : 'ready'}" data-video="${v.id}" data-value="1" onclick="vote(this, ${v.id}, 1)">👍</button>
            <button class="vote-btn ${userVote === -1 ? 'voted' : 'ready'}" data-video="${v.id}" data-value="-1" onclick="vote(this, ${v.id}, -1)">👎</button>
          </div>`;
      });
    });
}

function watchVideo(url, videoId) {
  fetch('/view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId })
  }).then(() => {
    const videoWindow = window.open('', '_blank');
    videoWindow.document.write(`
      <video controls autoplay style="width: 100%;">
        <source src="${url}" type="video/mp4">
        Seu navegador não suporta vídeo.
      </video>
    `);
    loadVideos();
  });
}

function downloadVideo(url, title) {
  fetch(url)
    .then(res => res.blob())
    .then(blob => {
      const a = document.createElement('a');
      const blobUrl = window.URL.createObjectURL(blob);
      a.href = blobUrl;
      a.download = `${title}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    })
    .catch(err => alert('Erro ao baixar: ' + err.message));
}

function vote(button, videoId, value) {
  const currentVote = JSON.parse(localStorage.getItem(`vote_${videoId}_${user.id}`)) || 0;
  const newValue = currentVote === value ? 0 : value;

  const likeBtn = document.querySelector(`.vote-btn[data-video="${videoId}"][data-value="1"]`);
  const dislikeBtn = document.querySelector(`.vote-btn[data-video="${videoId}"][data-value="-1"]`);
  likeBtn.disabled = true;
  dislikeBtn.disabled = true;

  fetch('/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, userId: user.id, value: newValue })
  })
  .then(res => {
    if (!res.ok) throw new Error('Erro ao votar: ' + res.status);
    return res.json();
  })
  .then(data => {
    localStorage.setItem(`vote_${videoId}_${user.id}`, newValue);
    console.log(`Voto aplicado: videoId=${videoId}, value=${newValue}, likes=${data.likes}, dislikes=${data.dislikes}`);
    loadVideos();
  })
  .catch(err => {
    console.error('Erro:', err);
    likeBtn.disabled = false;
    dislikeBtn.disabled = false;
    alert('Erro ao votar: ' + err.message);
  });
}

function searchVideos() {
  const query = document.getElementById('search').value;
  fetch(`/search?q=${query}`)
    .then(res => res.json())
    .then(videos => {
      const list = document.getElementById('video-list');
      list.innerHTML = '';
      videos.forEach(v => {
        const userVote = JSON.parse(localStorage.getItem(`vote_${v.id}_${user.id}`)) || 0;
        list.innerHTML += `
          <div class="video-item">
            <img src="/uploads/${v.thumbnail}">
            <p>${v.title}</p>
            <div class="video-info">
              <img src="${v.userPhoto ? '/uploads/' + v.userPhoto : '/public/default.jpg'}">${v.username} | 
              Visualizações: ${v.views} | 
              <span class="like">👍 ${v.likes}</span> 
              <span class="dislike">👎 ${v.dislikes}</span>
            </div>
            <button onclick="watchVideo('/uploads/${v.file}', ${v.id})">Assistir</button>
            <button onclick="downloadVideo('/uploads/${v.file}', '${v.title}')">Baixar</button>
            <button class="vote-btn ${userVote === 1 ? 'voted' : 'ready'}" data-video="${v.id}" data-value="1" onclick="vote(this, ${v.id}, 1)">👍</button>
            <button class="vote-btn ${userVote === -1 ? 'voted' : 'ready'}" data-video="${v.id}" data-value="-1" onclick="vote(this, ${v.id}, -1)">👎</button>
          </div>`;
      });
    });
}

function showUpload() {
  document.getElementById('main').style.display = 'none';
  document.getElementById('upload').style.display = 'block';
}

function uploadVideo() {
  const title = document.getElementById('video-title').value;
  const video = document.getElementById('video-file').files[0];
  const thumbnail = document.getElementById('thumbnail-file').files[0];
  if (!title || !video || !thumbnail) {
    alert('Preencha todos os campos!');
    return;
  }
  const formData = new FormData();
  formData.append('title', title);
  formData.append('video', video);
  formData.append('thumbnail', thumbnail);
  formData.append('user_id', user.id);

  console.log('Enviando:', { title, video: video.name, thumbnail: thumbnail.name, user_id: user.id });

  fetch('/upload', {
    method: 'POST',
    body: formData
  })
  .then(res => {
    if (!res.ok) throw new Error('Erro: ' + res.status);
    return res.json();
  })
  .then(data => {
    console.log('Sucesso:', data);
    document.getElementById('upload').style.display = 'none';
    document.getElementById('main').style.display = 'block';
    loadVideos();
  })
  .catch(err => {
    console.error('Erro:', err);
    alert('Falha ao enviar: ' + err.message);
  });
}

if (localStorage.getItem('user')) {
  user = JSON.parse(localStorage.getItem('user'));
  document.getElementById('login').style.display = 'none';
  document.getElementById('main').style.display = 'block';
  document.getElementById('user-photo').src = user.photo ? `/uploads/${user.photo}` : '/public/default.jpg';
  loadVideos();
}
