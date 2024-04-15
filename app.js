document.addEventListener('DOMContentLoaded', function() {
    fetchGames();
});

function fetchGames() {
    fetch('http://localhost:5000/games')
        .then(response => response.json())
        .then(data => {
            console.log("Jogos recebidos:", data);
            const select = document.getElementById('gameSelect');
            data.forEach(game => {
                const option = document.createElement('option');
                option.value = game.Game_ID;
                option.textContent = `${game.Home_Team_Acronym} X ${game.Opponent_Team_Acronym} - ${game.Game_date}`;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao buscar dados dos jogos:', error));
}


function fetchAndDrawGameEvents(gameId) {
    if (!gameId) {
        return; // Se não houver gameId, não faça nada
    }
    console.log(`Buscando eventos e jogadores para o jogo ID ${gameId}`);
    // Aqui você pode opcionalmente limpar a tela ou mostrar um loader
    Promise.all([
        fetch(`http://localhost:5000/game_events?gameId=${gameId}`).then(res => res.json()),
        fetch(`http://localhost:5000/home_players?gameId=${gameId}`).then(res => res.json()),
        fetch(`http://localhost:5000/opponent_players?gameId=${gameId}`).then(res => res.json()),
    ]).then(([events, homePlayers, opponentPlayers]) => {
        console.log("Eventos:", events);
        console.log("Jogadores da casa:", homePlayers);
        console.log("Jogadores oponentes:", opponentPlayers);
        
        populatePlayerList(homePlayers, 'homeList'); // Preencher lista dos jogadores da casa
        populatePlayerList(opponentPlayers, 'awayList'); // Preencher lista dos jogadores visitantes
        drawPositions(events, homePlayers, opponentPlayers);

        const groupedEvents = groupEventsByTime(events);
        createTimeline(groupedEvents);
        createTimelineForPeriods(gameId);
        
        if (events.length > 0) {
            console.log(events.length);
            updateTeamInfo(events[(events.length-1)]); // Passa o primeiro evento para atualizar as informações
        }
    }).catch(error => {
        console.error('Erro ao buscar dados dos jogadores:', error);
    });
}

function fetchEventsByTime(gameId, clockTime, period) {
    if (!gameId) {
        return; // Se não houver gameId, não faça nada
    }
    console.log(`Buscando eventos e jogadores para o jogo ID ${gameId} no Perido ${period} no tempo ${clockTime}`);

    Promise.all([
        fetch(`http://localhost:5000/home_players?gameId=${gameId}`).then(response => response.json()),
        fetch(`http://localhost:5000/opponent_players?gameId=${gameId}`).then(response => response.json()),
        fetch(`http://localhost:5000/game_events_by_time?gameId=${gameId}&clockTime=${clockTime}&period=${period}`).then(response => response.json())
    ]).then(([homePlayers, opponentPlayers, events]) => {
        console.log("Jogadores da casa:", homePlayers);
        console.log("Jogadores oponentes:", opponentPlayers);
        console.log("Eventos por tempo e período recebidos:", events);

        clearPlayerLists();
        // Chama a função para desenhar as posições na quadra
        drawPositions(events, homePlayers, opponentPlayers);

        // Atualiza as listas de jogadores na interface
        populatePlayerList(homePlayers, 'homeList');
        populatePlayerList(opponentPlayers, 'awayList');

        // Atualiza as informações do jogo, se necessário
        if (events.length > 0) {
            updateTeamInfo(events[events.length-1]);  // Atualiza com base no primeiro evento, ajuste conforme necessário
        }
    }).catch(error => {
        console.error('Erro ao buscar dados do jogo:', error);
    });
}

function fetchEventsByTimeAndPeriod(gameId, period, startTime, endTime) {
    if (!gameId) {
        console.error('No game ID provided');
        return; // Se não houver gameId, não faça nada
    }
    console.log(`Buscando eventos e jogadores para o jogo ID ${gameId} no período ${period} entre ${startTime} e ${endTime}`);

    Promise.all([
        fetch(`http://localhost:5000/home_players?gameId=${gameId}`).then(response => response.json()),
        fetch(`http://localhost:5000/opponent_players?gameId=${gameId}`).then(response => response.json()),
        fetch(`http://localhost:5000/game_events_by_interval?gameId=${gameId}&period=${period}&startTime=${startTime}&endTime=${endTime}`).then(response => response.json())
    ]).then(([homePlayers, opponentPlayers, events]) => {
        console.log("Jogadores da casa:", homePlayers);
        console.log("Jogadores oponentes:", opponentPlayers);
        console.log("Eventos por tempo e período recebidos:", events);

        clearPlayerLists(); // Limpa as listas de jogadores
        clearCanvas(); // Limpa o canvas para novos desenhos
        drawPositions(events, homePlayers, opponentPlayers); // Desenha as posições com base nos eventos

        populatePlayerList(homePlayers, 'homeList'); // Atualiza a lista de jogadores da casa
        populatePlayerList(opponentPlayers, 'awayList'); // Atualiza a lista de jogadores visitantes

        if (events.length > 0) {
            updateTeamInfo(events[events.length-1]); // Atualiza informações do jogo com o último evento da lista
        }
    }).catch(error => {
        console.error('Erro ao buscar dados do jogo:', error);
    });
}





function clearCanvas() {
    const canvas = document.getElementById('playersCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function drawGamePositions() {
    clearCanvas(); // Limpar a quadra antes de desenhar novas posições
    clearPlayerLists(); // Adicionado para limpar as listas de jogadores
    const selectedGameId = document.getElementById('gameSelect').value;
    console.log("Desenhando posições para o jogo ID:", selectedGameId);
    fetchAndDrawGameEvents(selectedGameId);
}

function groupEventsByTime(events) {
    const grouped = {};
    events.forEach(event => {
        const key = `${event.period}_${event.clock_time}`;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(event);
    });
    return grouped;
}

function createTimeline(eventsGrouped) {
    const timeline = document.getElementById('timelineContainer');
    const selectedGameId = document.getElementById('gameSelect').value; // Obter o ID do jogo selecionado

    timeline.innerHTML = ''; // Limpar timeline antiga
    Object.keys(eventsGrouped).forEach(timeKey => {
        const [period, clockTime] = timeKey.split('_');  // Extrai o período e o tempo do timeKey
        const button = document.createElement('button');
        button.textContent = `Período ${period}, Tempo ${clockTime}`; // Mostrar período e tempo no botão
        button.onclick = () => {
            clearCanvas(); // Limpar a quadra antes de desenhar novas posições
            clearPlayerLists(); // Limpar as listas de jogadores
            fetchEventsByTime(selectedGameId, clockTime, period); // Função modificada para passar período
        };
        timeline.appendChild(button);
    });
}

function createTimelineForPeriods(gameId) {
    const timelineUl = document.querySelector('#timelineContainerForPeriods ul');
    timelineUl.innerHTML = ''; // Limpar timeline antiga

    for (let period = 1; period <= 4; period++) {
        for (let interval = 0; interval < 12; interval += 3) {
            let startTime = `00:${interval.toString().padStart(2, '0')}:00`;
            let endTime = `00:${(interval + 3).toString().padStart(2, '0')}:00`;
            let timeKey = `P${period}: ${interval}-${interval + 3} min`;

            const li = document.createElement('li');
            const button = document.createElement('button');
            button.textContent = timeKey;
            button.onclick = () => {
                clearCanvas();
                clearPlayerLists();
                fetchEventsByTimeAndPeriod(gameId, period, startTime, endTime);
            };
            li.appendChild(button);
            timelineUl.appendChild(li);
        }
    }
}





function updateTeamInfo(event) {    
    document.getElementById('homeTeamInfo').innerHTML = event.Home_Team_Name+' - Placar: '+event.Home_Team_Score;
    document.getElementById('awayTeamInfo').innerHTML = event.Opponent_Team_Name+' - Placar: '+event.Opponent_Team_Score;
    document.getElementById('tempTeamInfo').innerHTML = "Quartil : "+event.period+'<br/> '+event.clock_time;
}


function clearPlayerLists() {
    document.getElementById('homeList').innerHTML = '';
    document.getElementById('awayList').innerHTML = '';
}


function populatePlayerList(playerList, listElementId) {
    const listElement = document.getElementById(listElementId);
    listElement.innerHTML = ''; // Limpa a lista antes de adicionar novos itens

    // Ordena a lista de jogadores pelo número da camisa
    playerList.sort((a, b) => a.Jersey_Number - b.Jersey_Number);

    playerList.forEach(player => {
        const listItem = document.createElement('li');
        // Altera o formato para colocar o número da camisa na frente
        listItem.textContent = `#${player.Jersey_Number} ${player.Nickname}`;
        listElement.appendChild(listItem);
    });
}




function drawPositions(events, homePlayers, opponentPlayers) {
    const courtContainer = document.getElementById('courtContainer');
    let canvas = document.getElementById('playersCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'playersCanvas';
        canvas.width = courtContainer.offsetWidth;
        canvas.height = courtContainer.offsetHeight;
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        courtContainer.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Converter as listas de jogadores em um mapa para fácil acesso
    const homePlayerNumbers = new Set(homePlayers.map(p => p.Jersey_Number));
    const opponentPlayerNumbers = new Set(opponentPlayers.map(p => p.Jersey_Number));

    // Desenhar jogadores com base nos eventos
    events.forEach(event => {
        if (event.position_court_x && event.position_court_y) {
            const posX = (event.position_court_x / 100) * canvas.width; // Ajustar conforme a escala real
            const posY = (event.position_court_y / 100) * canvas.height; // Ajustar conforme a escala real
            let marker, color, jerseyNumber = event.Jersey_Number;

            // Verificar se o número da camisa está na lista de jogadores da casa ou oponentes
            if (homePlayerNumbers.has(event.Jersey_Number)) {
                marker = 'O';
                color = '#0047AB';
            } else if (opponentPlayerNumbers.has(event.Jersey_Number)) {
                marker = 'X';
                color = '#8B0000';
            }

            // Se o jogador for reconhecido, desenhe-o
            if (marker && color) {
                drawPlayer(ctx, posX, posY, marker, color, jerseyNumber);
            }
        }
    });
}



function drawPlayer(ctx, x, y, marker, color, jerseyNumber) {
    ctx.font = '20px Arial';
    ctx.fillStyle = color;
    ctx.fillText(marker, x, y);

    // Define a cor azul para o número da camisa
    

    // Ajusta o posicionamento do número da camisa baseado no marcador
    if (marker === 'O') {
        ctx.fillStyle = 'blue';  // Usando azul para todos os números
        ctx.font = '12px Arial'; // Tamanho menor para o número
        ctx.fillText(jerseyNumber, x - 12, y - 12); // Posiciona o número acima do 'O'
    } else if (marker === 'X') {
        ctx.fillStyle = '#8B0000';  // Usando azul para todos os números
        ctx.font = '12px Arial';
        ctx.fillText(jerseyNumber, x + 12, y + 12); // Posiciona o número abaixo do 'X'
    }
}

