const { subscribe } = require("diagnostics_channel");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const palavrasProibidas = [
  "Macaco",
  "macaca",
  "macacada",
  "Preto sujo",
  "preto fedido",
  "preto de alma branca",
  "Negão",
  "nega fedida",
  "índio safado",
  "índio preguiçoso",
  "Paraíba",
  "paraibano",
  "nordestino burro",
  "paraíba de merda",
  "Besta",
  "besta-fera",
  "Macumbeiro",
  "macumba",
  "Traveco",
  "bode preto",
  "chinelo de pobre",
  "puta",
  "viado",
  "bicha",
  "bixa",
  "bixona",
  "bixinha",
  "buceta",
  "caralho",
  "cu",
  "piranha",
  "vagabunda",
];
const regexCensura = new RegExp(`\\b(${palavrasProibidas.join("|")})\\b`, "gi");
const cooldownUsuarios = new Map();
const TEMPO_COOLDOWN_MS = 2000;
const LIMITE_CARACTERES = 150;
app.use(express.static("public"));

const salasDeCinema = {
  terror: {
    indiceAtual: 0,
    inicioDoFilme: Date.now(),
    playlist: [
      {
        titulo: "Dr. Jekyll and Mr. Hyde (1931)",
        url: "https://archive.org/download/dr..-jekyll.-and.-mr..-hyde.-1931/Dr.%20Jekyll%20And%20Mr.%20Hyde%20%281931%29/mp4/Dr..Jekyll.And.Mr..Hyde.1931.mp4",
        legenda: "/subtitles/jekyll.vtt",
        poster:
          "https://www.themoviedb.org/t/p/w600_and_h900_face/fRKR4HlpPtNBBWbCwJo6rMxKSyy.jpg",
        duracao: 5880,
      },
      {
        titulo: "Frankenstein (1931)",
        url: "https://archive.org/download/frankenstein.-1931/Frankenstein%20%281931%29/Frankenstein.1931.mp4",
        legenda: "/subtitles/frankenstein.vtt",
        poster: "https://www.themoviedb.org/t/p/w600_and_h900_face/mu6wHwH0IwCCaEYtpqujuPJYat1.jpg",
        duracao: 4260,
      },
      {
        titulo: "Onibaba (1964)",
        url: "https://archive.org/download/onibaba.-1964_202511/Onibaba%20%281964%29/mp4/Onibaba.1964.ia.mp4",
        legenda: "/subtitles/onibaba.vtt",
        poster: "https://www.themoviedb.org/t/p/w600_and_h900_face/b14LU070wRIiX0PbSLcMgmX1tpi.jpg",
        duracao: 6180,
      },
      {
        titulo: "A Noite dos Mortos-Vivos (1968)",
        url: "https://dn721903.ca.archive.org/0/items/night-of-the-living-dead-1968-english/Night%20of%20the%20Living%20Dead%20%281968%29%20English.mp4",
        legenda: "/subtitles/night-of-the-living-dead.vtt",
        poster:
          "https://www.themoviedb.org/t/p/w600_and_h900_face/cFnQNwS8AVfRhSSOOkttLJOYvs4.jpg",
        duracao: 5760,
      },
      {
        titulo: "O Gabinete do Dr. Caligari (1920)",
        url: "https://archive.org/download/DasKabinettdesDoktorCaligariTheCabinetofDrCaligari/The_Cabinet_of_Dr._Caligari_512kb.mp4",
        legenda: "/subtitles/drcaligari.vtt",
        poster:
          "https://www.themoviedb.org/t/p/w600_and_h900_face/j09TT0S1crBSYjPu14vgzSSFqFo.jpg",
        duracao: 4380,
      },
      {
        titulo: "Drácula (1931)",
        url: "https://archive.org/download/dracula.-1931/Dracula%20%281931%29/Dracula.1931.mp4",
        legenda: "/subtitles/dracula.vtt",
        poster: "https://www.themoviedb.org/t/p/w600_and_h900_face/e8XjFqHMm1uTQ6vBDdwHkDsCVtT.jpg",
        duracao: 4500,
      },
      {
        titulo: "Os Nibelungos - A Morte de Siegfried (1924)",
        url: "https://archive.org/download/silent-die-nibelungen-siegfried/Die%20Nibelungen%3A%20Siegfried.mp4",
        legenda: "/subtitles/nibelungos.vtt",
        poster:
          "https://www.themoviedb.org/t/p/w600_and_h900_face/2jERXQVDkX0boSjQOzE9ZyDg8DC.jpg",
        duracao: 7200,
      },
      {
        titulo: "O Retrato de Dorian Gray (1945)",
        url: "https://archive.org/download/dorian-gray-1945/Dorian%20Gray%201945.mp4",
        legenda: "/subtitles/dorian-gray.vtt",
        poster: "https://www.themoviedb.org/t/p/w600_and_h900_face/3VW9IAPwlsp5O47Ile5GzLGDcqp.jpg",
        duracao: 5400,
      },
      {
        titulo: "O Fantasma da Ópera (1925)",
        url: "https://archive.org/download/ThePhantomoftheOpera/Phantom_of_the_Opera_512kb.mp4",
        legenda: "/subtitles/phantom.vtt",  
        poster: "https://www.themoviedb.org/t/p/w600_and_h900_face/gqTSBFPSCMzRACkFF2MepIqp4Gi.jpg",
        duracao: 5400,
      }
    ],
  },
};

setInterval(() => {
  const agora = Date.now();

  for (const idSala in salasDeCinema) {
    const sala = salasDeCinema[idSala];
    const filme = sala.playlist[sala.indiceAtual];
    const tempoDecorrido = (agora - sala.inicioDoFilme) / 1000;

    if (tempoDecorrido >= filme.duracao) {
      sala.indiceAtual = (sala.indiceAtual + 1) % sala.playlist.length;
      sala.inicioDoFilme = Date.now();

      const novoFilme = sala.playlist[sala.indiceAtual];

      io.to(idSala).emit("troca_de_filme", {
        titulo: novoFilme.titulo,
        url: novoFilme.url,
        subtitle: novoFilme.subtitle || null,
        tempoAtual: 0,
      });
    }
  }
}, 1000);

io.on("connection", (socket) => {
  socket.on("entrar_sala", (idSala) => {
    if (salasDeCinema[idSala]) {
      socket.join(idSala);
      socket.salaAtual = idSala;

      const sala = salasDeCinema[idSala];
      const filme = sala.playlist[sala.indiceAtual];
      const tempoAtual = (Date.now() - sala.inicioDoFilme) / 1000;
    const qtdEspectadores = io.sockets.adapter.rooms.get(idSala).size;
      io.to(idSala).emit("atualizar_contador", qtdEspectadores);
      socket.emit("status_video_atual", {
        titulo: filme.titulo,
        url: filme.url,
        legenda: filme.legenda,
        tempoAtual: tempoAtual,
        // --- NOVOS DADOS PARA O CRONOGRAMA ---
        playlist: sala.playlist,
        indiceAtual: sala.indiceAtual,
        inicioDoFilme: sala.inicioDoFilme,
      });
    }
  });

  socket.on("enviar_mensagem", (dados) => {
    const agora = Date.now();
    const ultimoEnvio = cooldownUsuarios.get(socket.id) || 0;

    // 1. Bloqueio Anti-Spam (Rate Limiting)
    if (agora - ultimoEnvio < TEMPO_COOLDOWN_MS) {
      // Devolve um erro silencioso apenas para o remetente
      socket.emit(
        "aviso_sistema",
        "Aguarde o rolo de filme girar antes de enviar outra mensagem (2 segundos).",
      );
      return; // Interrompe a execução aqui, a mensagem não é enviada para a sala
    }

    // Atualiza o tempo do último envio deste usuário
    cooldownUsuarios.set(socket.id, agora);

    // 2. Limpeza e Filtro Anti-Ofensas
    let textoLimpo = dados.texto.trim();

    // Limita o tamanho máximo da mensagem
    if (textoLimpo.length > LIMITE_CARACTERES) {
      textoLimpo = textoLimpo.substring(0, LIMITE_CARACTERES) + "...";
    }

    // Substitui as palavras da lista por asteriscos
    textoLimpo = textoLimpo.replace(regexCensura, "***");

    // Emite a mensagem limpa para todos na sala
    if (textoLimpo !== "") {
      io.to(dados.sala).emit("nova_mensagem", {
        usuario: dados.usuario,
        texto: textoLimpo,
      });
    }
  });

  // É importante limpar o registro do usuário quando ele sair para liberar memória da VPS/Render
  socket.on("disconnect", () => {
    cooldownUsuarios.delete(socket.id);
    if (socket.salaAtual) {
      const sala = io.sockets.adapter.rooms.get(socket.salaAtual);
      const qtdEspectadores = sala ? sala.size : 0;
      io.to(socket.salaAtual).emit("atualizar_contador", qtdEspectadores);
    }
    
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
