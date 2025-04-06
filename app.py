import os
from flask import Flask, request, send_from_directory, render_template, redirect, url_for, session
import urllib.parse

app = Flask(__name__)
app.secret_key = 'chave_secreta_123'  # Chave simples pra sessões

# Pasta pros vídeos
UPLOAD_FOLDER = "videos"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Login
@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        idade = int(request.form['idade'])
        if idade < 18:
            return "Você precisa ser maior de idade!"
        session['email'] = email
        return redirect(url_for('home'))
    return render_template('login.html')

# Lista de vídeos
@app.route('/home')
def home():
    if 'email' not in session:
        return redirect(url_for('login'))
    videos = os.listdir(app.config['UPLOAD_FOLDER'])
    return render_template('home.html', videos=videos)

# Assistir vídeo
@app.route('/assistir/<nome_arquivo>')
def assistir_video(nome_arquivo):
    if 'email' not in session:
        return redirect(url_for('login'))
    video_url = f"/videos/{urllib.parse.quote(nome_arquivo)}"
    return render_template('assistir.html', video_url=video_url, nome_arquivo=nome_arquivo)

# Baixar vídeo
@app.route('/videos/<nome_arquivo>')
def servir_video(nome_arquivo):
    if 'email' not in session:
        return redirect(url_for('login'))
    return send_from_directory(app.config['UPLOAD_FOLDER'], nome_arquivo, as_attachment=True)

# Upload de vídeos
@app.route('/upload', methods=['GET', 'POST'])
def upload_video():
    if 'email' not in session:
        return redirect(url_for('login'))
    if request.method == 'POST':
        if 'video' not in request.files:
            return "Nenhum vídeo enviado!", 400
        file = request.files['video']
        filename = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filename)
        return redirect(url_for('home'))
    return render_template('upload.html')

# Logout
@app.route('/logout')
def logout():
    session.pop('email', None)
    return redirect(url_for('login'))

# Pra rodar no Render
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))

