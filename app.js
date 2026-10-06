const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}


/* =========================
   GAME STATE
========================= */

const game = {
    players: [],
    events: [],
    interactions: [],
    winner: null,
    started: false
};


/* =========================
   HELPERS
========================= */

const $ = (id) => document.getElementById(id);


function showScreen(screenId) {

    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });

    $(screenId).classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================
   ROLES
========================= */

function getRoleName(role) {

    const roles = {
        mafia: "Мафия",
        commissioner: "Комиссар",
        doctor: "Доктор",
        civilian: "Мирный"
    };

    return roles[role] || "Роль не назначена";
}


function getRoleOptions(selectedRole) {

    const roles = [
        ["mafia", "Мафия"],
        ["commissioner", "Комиссар"],
        ["doctor", "Доктор"],
        ["civilian", "Мирный"]
    ];

    return roles.map(([value, name]) => {

        return `
            <option
                value="${value}"
                ${selectedRole === value ? "selected" : ""}
            >
                ${name}
            </option>
        `;

    }).join("");
}


/* =========================
   CREATE PLAYERS
========================= */

function createPlayers() {

    const count = Number($("playerCount").value);

    if (count < 6 || count > 15) {

        alert("Количество игроков должно быть от 6 до 15.");

        return;
    }


    const container = $("namesContainer");

    container.innerHTML = "";


    for (let i = 0; i < count; i++) {

        container.innerHTML += `

            <div class="card">

                <label>
                    Игрок ${i + 1}
                </label>

                <input
                    type="text"
                    class="player-name-input"
                    data-player-index="${i}"
                    placeholder="Введите имя"
                    autocomplete="off"
                >

            </div>

        `;
    }


    $("namesError").textContent = "";

    showScreen("screen-names");
}


/* =========================
   NAMES → ROLES
========================= */

function goToRoles() {

    const inputs =
        document.querySelectorAll(".player-name-input");

    const names = [];

    for (const input of inputs) {

        const name = input.value.trim();

        if (!name) {

            $("namesError").textContent =
                "Заполните имена всех игроков.";

            return;
        }

        names.push(name);
    }


    const normalizedNames =
        names.map(name => name.toLowerCase());


    const uniqueNames =
        new Set(normalizedNames);


    if (uniqueNames.size !== names.length) {

        $("namesError").textContent =
            "Имена игроков должны отличаться.";

        return;
    }


    const count = names.length;


    /*
        Количество мафии:

        6–7 игроков  → 1
        8–11 игроков → 2
        12–15 игроков → 3
    */

    let mafiaCount = 1;

    if (count >= 8) {
        mafiaCount = 2;
    }

    if (count >= 12) {
        mafiaCount = 3;
    }


    game.players = names.map((name, index) => {

        return {
            id: index + 1,
            name,
            role: null,
            alive: true,

            votes: 0,

            eliminatedAt: null,
            eliminationReason: null
        };

    });


    renderRoles(mafiaCount);

    showScreen("screen-roles");
}


/* =========================
   ROLES SCREEN
========================= */

function renderRoles(mafiaCount) {

    const count = game.players.length;

    const civilians =
        count - mafiaCount - 2;


    $("rolesContainer").innerHTML = `

        <div class="card">

            <div class="role-row">
                <span>Мафия</span>
                <strong>${mafiaCount}</strong>
            </div>

            <div class="role-row">
                <span>Комиссар</span>
                <strong>1</strong>
            </div>

            <div class="role-row">
                <span>Доктор</span>
                <strong>1</strong>
            </div>

            <div class="role-row">
                <span>Мирные жители</span>
                <strong>${civilians}</strong>
            </div>

        </div>

    `;
}


/* =========================
   SHUFFLE
========================= */

function shuffle(array) {

    const result = [...array];

    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] =
            [result[j], result[i]];
    }

    return result;
}


/* =========================
   ASSIGN ROLES
========================= */

function assignRoles() {

    const count = game.players.length;

    let mafiaCount = 1;

    if (count >= 8) {
        mafiaCount = 2;
    }

    if (count >= 12) {
        mafiaCount = 3;
    }


    const roles = [];


    for (let i = 0; i < mafiaCount; i++) {
        roles.push("mafia");
    }


    roles.push("commissioner");
    roles.push("doctor");


    while (roles.length < count) {
        roles.push("civilian");
    }


    const shuffledRoles = shuffle(roles);


    game.players.forEach((player, index) => {

        player.role =
            shuffledRoles[index];

    });
}


/* =========================
   START GAME
========================= */

function startGame() {

    assignRoles();

    game.events = [];
    game.interactions = [];
    game.winner = null;
    game.started = true;


    game.players.forEach(player => {

        player.alive = true;
        player.votes = 0;
        player.eliminatedAt = null;
        player.eliminationReason = null;

    });


    addEvent("Игра началась.");

    renderGame();

    showScreen("screen-game");
}


/* =========================
   ROLE CHANGE
========================= */

function changePlayerRole(playerId, newRole) {

    const player =
        game.players.find(p => p.id === playerId);

    if (!player) {
        return;
    }


    const oldRole = player.role;


    if (oldRole === newRole) {
        return;
    }


    player.role = newRole;


    addEvent(
        `Роль игрока "${player.name}" изменена: ` +
        `${getRoleName(oldRole)} → ${getRoleName(newRole)}.`
    );


    renderGame();
}


/* =========================
   EVENTS
========================= */

function addEvent(text) {

    const time =
        new Date().toLocaleTimeString(
            "ru-RU",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );


    game.events.unshift({
        time,
        text
    });
}


/* =========================
   RENDER GAME
========================= */

function renderGame() {

    const alivePlayers =
        game.players.filter(player => player.alive);

    const deadPlayers =
        game.players.filter(player => !player.alive);


    $("statTotal").textContent =
        game.players.length;

    $("statAlive").textContent =
        alivePlayers.length;

    $("statDead").textContent =
        deadPlayers.length;


    const container =
        $("playersContainer");

    container.innerHTML = "";


    game.players.forEach(player => {

        const statusText =
            player.alive
                ? "В игре"
                : "Выбыл";


        const statusClass =
            player.alive
                ? ""
                : "dead";


        container.innerHTML += `

            <div class="player-card">

                <div class="player-header">

                    <div>

                        <div class="player-name">
                            ${escapeHtml(player.name)}
                        </div>

                        <div class="player-role">
                            ${getRoleName(player.role)}
                        </div>

                    </div>

                    <div class="player-status ${statusClass}">
                        ${statusText}
                    </div>

                </div>


                <select
                    class="role-select"
                    data-role-player="${player.id}"
                >

                    ${getRoleOptions(player.role)}

                </select>


                <div class="vote-block">

                    <div class="vote-title">
                        Голоса
                    </div>

                    <div class="vote-controls">

                        <button
                            class="vote-btn"
                            data-vote-minus="${player.id}"
                        >
                            −
                        </button>

                        <div class="vote-number">
                            ${player.votes}
                        </div>

                        <button
                            class="vote-btn"
                            data-vote-plus="${player.id}"
                        >
                            +
                        </button>

                    </div>

                </div>


                <div class="player-controls">

                    ${
                        player.alive
                        ?
                        `
                            <button
                                class="btn danger"
                                data-eliminate="${player.id}"
                            >
                                Вывести
                            </button>
                        `
                        :
                        `
                            <button
                                class="btn secondary"
                                data-return="${player.id}"
                            >
                                Вернуть
                            </button>
                        `
                    }

                    <button
                        class="btn secondary"
                        data-player-interaction="${player.id}"
                    >
                        Взаимодействия
                    </button>

                </div>

            </div>

        `;
    });


    renderHistory();
    renderInteractionStats();


    /*
        Обработчики изменения ролей
    */

    document
        .querySelectorAll("[data-role-player]")
        .forEach(select => {

            select.addEventListener(
                "change",
                () => {

                    const playerId =
                        Number(select.dataset.rolePlayer);

                    changePlayerRole(
                        playerId,
                        select.value
                    );

                }
            );

        });


    /*
        Добавление голоса
    */

    document
        .querySelectorAll("[data-vote-plus]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const playerId =
                        Number(button.dataset.votePlus);

                    changeVotes(playerId, 1);

                }
            );

        });


    /*
        Уменьшение голоса
    */

    document
        .querySelectorAll("[data-vote-minus]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const playerId =
                        Number(button.dataset.voteMinus);

                    changeVotes(playerId, -1);

                }
            );

        });


    /*
        Выведение игрока
    */

    document
        .querySelectorAll("[data-eliminate]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const playerId =
                        Number(button.dataset.eliminate);

                    eliminatePlayer(playerId);

                }
            );

        });


    /*
        Возвращение игрока
    */

    document
        .querySelectorAll("[data-return]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const playerId =
                        Number(button.dataset.return);

                    returnPlayer(playerId);

                }
            );

        });


    /*
        Взаимодействия игрока
    */

    document
        .querySelectorAll("[data-player-interaction]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const playerId =
                        Number(
                            button.dataset.playerInteraction
                        );

                    openInteractionModal(playerId);

                }
            );

        });
}


/* =========================
   VOTES
========================= */

function changeVotes(playerId, amount) {

    const player =
        game.players.find(p => p.id === playerId);

    if (!player) {
        return;
    }


    player.votes += amount;


    if (player.votes < 0) {
        player.votes = 0;
    }


    renderGame();
}


function resetVotes() {

    game.players.forEach(player => {
        player.votes = 0;
    });


    addEvent("Голоса сброшены.");

    renderGame();
}


/* =========================
   ELIMINATION
========================= */

function eliminatePlayer(playerId) {

    const player =
        game.players.find(p => p.id === playerId);

    if (!player || !player.alive) {
        return;
    }


    const reason =
        prompt(
            `Причина выбытия игрока "${player.name}"?`,
            "Голосование"
        );


    if (reason === null) {
        return;
    }


    player.alive = false;

    player.eliminatedAt =
        new Date().toISOString();

    player.eliminationReason =
        reason.trim() || "Не указано";


    addEvent(
        `${player.name} выбыл. ` +
        `Причина: ${player.eliminationReason}`
    );


    const winner =
        checkWinner();


    if (winner) {

        finishGame(winner);

        return;
    }


    renderGame();
}


/* =========================
   RETURN PLAYER
========================= */

function returnPlayer(playerId) {

    const player =
        game.players.find(p => p.id === playerId);

    if (!player || player.alive) {
        return;
    }


    const confirmed =
        confirm(
            `Вернуть игрока "${player.name}" в игру?`
        );


    if (!confirmed) {
        return;
    }


    player.alive = true;
    player.eliminatedAt = null;
    player.eliminationReason = null;


    addEvent(
        `${player.name} возвращён в игру.`
    );


    game.winner = null;
    game.started = true;


    renderGame();
}


/* =========================
   WINNER CHECK
========================= */

function checkWinner() {

    const alive =
        game.players.filter(
            player => player.alive
        );


    const mafia =
        alive.filter(
            player => player.role === "mafia"
        ).length;


    const nonMafia =
        alive.filter(
            player => player.role !== "mafia"
        ).length;


    /*
        Если мафии больше нет —
        победили мирные.
    */

    if (mafia === 0) {
        return "civilians";
    }


    /*
        Если мафия получила большинство
        или равенство — победила мафия.
    */

    if (mafia >= nonMafia) {
        return "mafia";
    }


    return null;
}


/* =========================
   FINISH GAME
========================= */

function finishGame(winner) {

    game.winner = winner;
    game.started = false;


    addEvent("Игра окончена.");


    if (winner === "mafia") {

        $("winnerTitle").textContent =
            "МАФИЯ ПОБЕДИЛА";

        $("winnerSubtitle").textContent =
            "Мафия получила контроль над игрой.";

    } else {

        $("winnerTitle").textContent =
            "МИРНЫЕ ПОБЕДИЛИ";

        $("winnerSubtitle").textContent =
            "Все игроки мафии были устранены.";
    }


    showScreen("screen-winner");
}


/* =========================
   HISTORY
========================= */

function renderHistory() {

    const container =
        $("historyContainer");


    if (!game.events.length) {

        container.innerHTML =
            `<div class="empty-state">
                История пока пуста.
            </div>`;

        return;
    }


    container.innerHTML =
        game.events.map(event => {

            return `
                <div class="history-item">

                    <span>
                        ${event.time}
                    </span>

                    <div>
                        ${escapeHtml(event.text)}
                    </div>

                </div>
            `;

        }).join("");
}


/* =========================
   INTERACTIONS
========================= */

function openInteractionModal(actorId = null) {

    const actorSelect =
        $("interactionActor");

    const targetSelect =
        $("interactionTarget");


    actorSelect.innerHTML =
        game.players.map(player => {

            return `
                <option
                    value="${player.id}"
                    ${player.id === actorId ? "selected" : ""}
                >
                    ${escapeHtml(player.name)}
                    — ${getRoleName(player.role)}
                </option>
            `;

        }).join("");


    targetSelect.innerHTML =
        game.players.map(player => {

            return `
                <option value="${player.id}">
                    ${escapeHtml(player.name)}
                    — ${getRoleName(player.role)}
                </option>
            `;

        }).join("");


    $("interactionDescription").value = "";


    $("interactionModal")
        .classList.add("active");
}


function closeInteractionModal() {

    $("interactionModal")
        .classList.remove("active");
}


function saveInteraction() {

    const actorId =
        Number($("interactionActor").value);

    const targetId =
        Number($("interactionTarget").value);

    const description =
        $("interactionDescription")
            .value
            .trim();


    if (!actorId || !targetId) {

        alert("Выберите игроков.");

        return;
    }


    if (actorId === targetId) {

        alert(
            "Игрок не может взаимодействовать сам с собой."
        );

        return;
    }


    if (!description) {

        alert(
            "Укажите, что произошло."
        );

        return;
    }


    const actor =
        game.players.find(
            player => player.id === actorId
        );

    const target =
        game.players.find(
            player => player.id === targetId
        );


    /*
        Сохраняем роль именно на момент
        взаимодействия.

        Это важно, если роль игрока
        позже будет изменена.
    */

    game.interactions.push({

        id: Date.now(),

        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,

        targetId: target.id,
        targetName: target.name,
        targetRole: target.role,

        description,

        createdAt:
            new Date().toISOString()
    });


    addEvent(
        `${actor.name} взаимодействовал с ` +
        `${target.name}: ${description}.`
    );


    closeInteractionModal();

    renderGame();
}


/* =========================
   INTERACTION STATISTICS
========================= */

function buildInteractionStatistics() {

    const stats = {};


    game.interactions.forEach(interaction => {

        const actorRole =
            interaction.actorRole;

        const key =
            `${interaction.actorId}_${interaction.targetId}`;


        if (!stats[actorRole]) {

            stats[actorRole] = {};
        }


        if (!stats[actorRole][key]) {

            stats[actorRole][key] = {

                actorName:
                    interaction.actorName,

                targetName:
                    interaction.targetName,

                targetRole:
                    interaction.targetRole,

                count: 0,

                details: []
            };
        }


        stats[actorRole][key].count++;


        stats[actorRole][key].details.push(
            interaction.description
        );

    });


    return stats;
}


function renderInteractionStats(
    targetId = "interactionStats"
) {

    const container =
        $(targetId);


    if (!game.interactions.length) {

        container.innerHTML =
            `<div class="empty-state">
                Взаимодействий пока нет.
            </div>`;

        return;
    }


    const stats =
        buildInteractionStatistics();


    let html = "";


    Object.keys(stats).forEach(role => {

        const roleName =
            getRoleName(role);


        html += `

            <div class="interaction-stat-card">

                <div class="interaction-stat-role">
                    ${roleName}
                </div>

        `;


        Object.values(stats[role]).forEach(item => {

            html += `

                <div class="interaction-line">

                    <div>

                        <strong>
                            ${escapeHtml(item.actorName)}
                        </strong>

                        →
                        
                        ${escapeHtml(item.targetName)}

                        <div class="player-role">
                            ${getRoleName(item.targetRole)}
                        </div>

                    </div>

                    <div class="interaction-count">
                        ${item.count} раз
                    </div>

                </div>

            `;

        });


        html += `
            </div>
        `;
    });


    container.innerHTML = html;
}


/* =========================
   RESULTS
========================= */

function showResults() {

    const container =
        $("resultsContainer");


    container.innerHTML =
        game.players.map(player => {

            return `

                <div class="result-player">

                    <div class="result-main">

                        <div>

                            <div class="player-name">
                                ${escapeHtml(player.name)}
                            </div>

                            <div class="result-role">
                                ${getRoleName(player.role)}
                            </div>

                        </div>


                        <div class="result-votes">

                            <strong>
                                ${player.votes}
                            </strong>

                            <span>
                                голосов
                            </span>

                        </div>

                    </div>

                    <div class="player-status ${
                        player.alive ? "" : "dead"
                    }">

                        ${
                            player.alive
                                ? "Остался в игре"
                                : "Выбыл"
                        }

                    </div>

                </div>

            `;

        }).join("");


    renderInteractionStats(
        "resultsInteractionStats"
    );


    showScreen("screen-results");
}


/* =========================
   NEW GAME
========================= */

function newGame() {

    game.players = [];
    game.events = [];
    game.interactions = [];
    game.winner = null;
    game.started = false;


    $("playerCount").value = "6";


    showScreen("screen-start");
}


/* =========================
   EVENT LISTENERS
========================= */

$("btnCreatePlayers")
    .addEventListener(
        "click",
        createPlayers
    );


$("btnToRoles")
    .addEventListener(
        "click",
        goToRoles
    );


$("btnStartGame")
    .addEventListener(
        "click",
        startGame
    );


$("btnResults")
    .addEventListener(
        "click",
        showResults
    );


$("btnNewGame")
    .addEventListener(
        "click",
        newGame
    );


$("btnNewGameFromResults")
    .addEventListener(
        "click",
        newGame
    );


$("btnFinishGame")
    .addEventListener(
        "click",
        () => {

            if (
                !confirm(
                    "Завершить текущую игру?"
                )
            ) {
                return;
            }


            /*
                Если ведущий завершил игру вручную,
                просто показываем результаты.
            */

            game.started = false;

            game.winner = "manual";


            $("winnerTitle").textContent =
                "ИГРА ЗАВЕРШЕНА";

            $("winnerSubtitle").textContent =
                "Игра была завершена ведущим.";


            showScreen("screen-winner");
        }
    );


$("btnResetVotes")
    .addEventListener(
        "click",
        () => {

            if (
                confirm(
                    "Сбросить все голоса?"
                )
            ) {

                resetVotes();
            }
        }
    );


$("btnAddInteraction")
    .addEventListener(
        "click",
        () => {

            openInteractionModal();
        }
    );


$("btnCancelInteraction")
    .addEventListener(
        "click",
        closeInteractionModal
    );


$("btnSaveInteraction")
    .addEventListener(
        "click",
        saveInteraction
    );


/* =========================
   BACK BUTTONS
========================= */

document
    .querySelectorAll("[data-back]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const activeScreen =
                    document.querySelector(
                        ".screen.active"
                    );


                if (
                    activeScreen.id ===
                    "screen-names"
                ) {

                    showScreen("screen-start");

                    return;
                }


                if (
                    activeScreen.id ===
                    "screen-roles"
                ) {

                    showScreen("screen-names");

                    return;
                }

            }
        );

    });


/* =========================
   TELEGRAM BACK BUTTON
========================= */

if (tg) {

    tg.BackButton.onClick(() => {

        const activeScreen =
            document.querySelector(
                ".screen.active"
            );


        if (
            activeScreen.id ===
            "screen-names"
        ) {

            showScreen("screen-start");

            tg.BackButton.hide();

            return;
        }


        if (
            activeScreen.id ===
            "screen-roles"
        ) {

            showScreen("screen-names");

            return;
        }

    });
}


console.log("MAFIA ROOM запущен");
