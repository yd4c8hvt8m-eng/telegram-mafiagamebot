/* =====================================================
   TELEGRAM
===================================================== */

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}


/* =====================================================
   GAME STATE
===================================================== */

const game = {

    players: [],

    round: 1,

    phase: "setup",

    started: false,

    finished: false,

    winner: null,

    events: [],

    interactions: [],

    votes: [],

    nightActions: {

        mafiaTarget: null,

        doctorTarget: null,

        commissionerTarget: null

    },

    settings: {

        doctorSelfHeal: true,

        showRoleAfterDeath: true

    }

};


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let editingPlayerId = null;


/* =====================================================
   HELPERS
===================================================== */

function $(id) {
    return document.getElementById(id);
}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function showScreen(id) {

    document
        .querySelectorAll(".screen")
        .forEach(screen => {

            screen.classList.remove("active");

        });


    $(id).classList.add("active");


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function getRoleName(role) {

    const roles = {

        mafia: "Мафия",

        commissioner: "Комиссар",

        doctor: "Доктор",

        civilian: "Мирный"

    };


    return roles[role] || "Не назначена";
}


function getAlivePlayers() {

    return game.players.filter(
        player => player.alive
    );
}


function getPlayer(id) {

    return game.players.find(
        player => player.id === Number(id)
    );
}


function getTime() {

    return new Date().toLocaleTimeString(
        "ru-RU",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* =====================================================
   EVENT / HISTORY
===================================================== */

function addEvent(text, type = "game") {

    game.events.unshift({

        time: getTime(),

        text,

        type,

        round: game.round,

        phase: game.phase

    });
}


/* =====================================================
   PLAYER COUNT
===================================================== */

let selectedPlayerCount = 6;


function updatePlayerCount() {

    $("playerCount").textContent =
        selectedPlayerCount;
}


$("btnCountMinus").addEventListener(
    "click",
    () => {

        if (selectedPlayerCount > 6) {

            selectedPlayerCount--;

            updatePlayerCount();

        }

    }
);


$("btnCountPlus").addEventListener(
    "click",
    () => {

        if (selectedPlayerCount < 15) {

            selectedPlayerCount++;

            updatePlayerCount();

        }

    }
);


/* =====================================================
   CREATE GAME
===================================================== */

$("btnCreateGame").addEventListener(
    "click",
    createGame
);


function createGame() {

    game.players = [];

    game.events = [];

    game.interactions = [];

    game.votes = [];

    game.round = 1;

    game.phase = "day";

    game.started = true;

    game.finished = false;

    game.winner = null;

    game.nightActions = {

        mafiaTarget: null,

        doctorTarget: null,

        commissionerTarget: null

    };


    for (
        let i = 1;
        i <= selectedPlayerCount;
        i++
    ) {

        game.players.push({

            id: i,

            name: `Игрок ${i}`,

            role: "civilian",

            alive: true,

            eliminatedReason: null,

            eliminatedAt: null

        });

    }


    addEvent(
        `Создана игра на ${selectedPlayerCount} игроков.`
    );


    renderGame();

    showScreen("screen-game");
}


/* =====================================================
   ROLE DISTRIBUTION
===================================================== */

function getRecommendedRoles(count) {

    let mafia = 1;

    if (count >= 8) {
        mafia = 2;
    }

    if (count >= 12) {
        mafia = 3;
    }


    const roles = [];


    for (let i = 0; i < mafia; i++) {
        roles.push("mafia");
    }


    roles.push("commissioner");

    roles.push("doctor");


    while (roles.length < count) {
        roles.push("civilian");
    }


    return roles;
}


/* =====================================================
   PLAYER EDIT
===================================================== */

function openPlayerEditor(playerId) {

    const player =
        getPlayer(playerId);

    if (!player) {
        return;
    }


    editingPlayerId =
        player.id;


    $("playerNameInput").value =
        player.name;


    $("playerRoleInput").value =
        player.role;


    $("playerModal")
        .classList.add("active");
}


function closePlayerEditor() {

    editingPlayerId = null;

    $("playerModal")
        .classList.remove("active");
}


$("btnCancelPlayer")
    .addEventListener(
        "click",
        closePlayerEditor
    );


$("btnSavePlayer")
    .addEventListener(
        "click",
        savePlayer
    );


function savePlayer() {

    const player =
        getPlayer(editingPlayerId);

    if (!player) {
        return;
    }


    const newName =
        $("playerNameInput")
            .value
            .trim();


    const newRole =
        $("playerRoleInput")
            .value;


    if (!newName) {

        alert("Введите имя игрока.");

        return;
    }


    const duplicate =
        game.players.some(
            other =>
                other.id !== player.id &&
                other.name.toLowerCase() ===
                newName.toLowerCase()
        );


    if (duplicate) {

        alert(
            "Игрок с таким именем уже существует."
        );

        return;
    }


    const oldName =
        player.name;

    const oldRole =
        player.role;


    player.name =
        newName;

    player.role =
        newRole;


    if (oldName !== newName) {

        addEvent(
            `Имя игрока изменено: "${oldName}" → "${newName}".`
        );

    }


    if (oldRole !== newRole) {

        addEvent(
            `Роль "${player.name}" изменена: ` +
            `${getRoleName(oldRole)} → ${getRoleName(newRole)}.`
        );

    }


    closePlayerEditor();

    renderGame();
}


/* =====================================================
   RENDER PLAYERS
===================================================== */

function renderPlayers() {

    const container =
        $("playersContainer");


    container.innerHTML = "";


    game.players.forEach((player, index) => {

        const roleText =
            getRoleName(player.role);


        let visibleRole =
            roleText;


        if (
            !player.alive &&
            !game.settings.showRoleAfterDeath
        ) {

            visibleRole =
                "Роль скрыта";
        }


        container.innerHTML += `

            <div class="player-card">

                <div class="player-top">

                    <div>

                        <div class="player-number">
                            Игрок ${index + 1}
                        </div>

                        <div class="player-name">
                            ${escapeHtml(player.name)}
                        </div>

                        <div class="player-role">
                            ${visibleRole}
                        </div>

                    </div>


                    <div class="
                        player-status
                        ${player.alive ? "" : "dead"}
                    ">

                        ${
                            player.alive
                                ? "Жив"
                                : "Выбыл"
                        }

                    </div>

                </div>


                <div class="player-buttons">

                    <button
                        class="btn secondary"
                        data-edit-player="${player.id}"
                    >
                        Изменить
                    </button>


                    ${
                        player.alive

                        ?

                        `
                            <button
                                class="btn danger"
                                data-eliminate-player="${player.id}"
                            >
                                Вывести
                            </button>
                        `

                        :

                        `
                            <button
                                class="btn secondary"
                                data-return-player="${player.id}"
                            >
                                Вернуть
                            </button>
                        `
                    }

                </div>

            </div>

        `;

    });


    document
        .querySelectorAll("[data-edit-player]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    openPlayerEditor(
                        button.dataset.editPlayer
                    );

                }
            );

        });


    document
        .querySelectorAll("[data-eliminate-player]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    eliminatePlayer(
                        button.dataset.eliminatePlayer,
                        "Ручное выбытие"
                    );

                }
            );

        });


    document
        .querySelectorAll("[data-return-player]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    returnPlayer(
                        button.dataset.returnPlayer
                    );

                }
            );

        });
}


/* =====================================================
   ELIMINATE PLAYER
===================================================== */

function eliminatePlayer(
    playerId,
    reason = "Ручное выбытие"
) {

    const player =
        getPlayer(playerId);


    if (!player || !player.alive) {
        return;
    }


    if (
        !confirm(
            `Вывести игрока "${player.name}" из игры?`
        )
    ) {

        return;
    }


    player.alive = false;

    player.eliminatedReason =
        reason;

    player.eliminatedAt =
        new Date().toISOString();


    addEvent(
        `${player.name} выбыл. Причина: ${reason}.`
    );


    checkWinner();


    renderGame();
}


/* =====================================================
   RETURN PLAYER
===================================================== */

function returnPlayer(playerId) {

    const player =
        getPlayer(playerId);


    if (!player || player.alive) {
        return;
    }


    if (
        !confirm(
            `Вернуть "${player.name}" в игру?`
        )
    ) {

        return;
    }


    player.alive = true;

    player.eliminatedReason = null;

    player.eliminatedAt = null;


    game.finished = false;

    game.winner = null;


    addEvent(
        `${player.name} возвращён в игру.`
    );


    renderGame();
}


/* =====================================================
   PHASE
===================================================== */

$("btnStartNight")
    .addEventListener(
        "click",
        startNight
    );


$("btnStartDay")
    .addEventListener(
        "click",
        startDay
    );


function startNight() {

    if (game.finished) {
        return;
    }


    game.phase = "night";


    game.nightActions = {

        mafiaTarget: null,

        doctorTarget: null,

        commissionerTarget: null

    };


    addEvent(
        `Началась ночь ${game.round}.`
    );


    renderGame();
}


function startDay() {

    if (game.finished) {
        return;
    }


    game.phase = "day";


    addEvent(
        `Начался день ${game.round}.`
    );


    renderGame();
}


/* =====================================================
   NIGHT ACTIONS
===================================================== */

function renderNightActions() {

    const container =
        $("nightActionsContainer");


    if (game.phase !== "night") {

        container.innerHTML = `
            <div class="empty-state">
                Ночные действия доступны только ночью.
            </div>
        `;

        return;
    }


    const mafia =
        game.players.filter(
            player =>
                player.alive &&
                player.role === "mafia"
        );


    const doctor =
        game.players.find(
            player =>
                player.alive &&
                player.role === "doctor"
        );


    const commissioner =
        game.players.find(
            player =>
                player.alive &&
                player.role === "commissioner"
        );


    container.innerHTML = `

        <div class="action-row">

            <div class="action-item">

                <div class="action-label">
                    Мафия
                </div>

                <div class="action-value">
                    ${
                        mafia.length
                            ? mafia.map(
                                p =>
                                    escapeHtml(p.name)
                              ).join(", ")
                            : "Нет живой мафии"
                    }
                </div>

            </div>


            <div class="action-item">

                <div class="action-label">
                    Цель мафии
                </div>

                <div class="action-value">

                    ${
                        game.nightActions.mafiaTarget
                            ? escapeHtml(
                                getPlayer(
                                    game.nightActions.mafiaTarget
                                )?.name
                              )
                            : "Не выбрана"
                    }

                </div>

            </div>

        </div>


        <button
            id="btnMafiaAction"
            class="btn secondary full"
        >
            Действие мафии
        </button>


        <div class="action-row">

            <div class="action-item">

                <div class="action-label">
                    Доктор
                </div>

                <div class="action-value">

                    ${
                        doctor
                            ? escapeHtml(doctor.name)
                            : "Нет доктора"
                    }

                </div>

            </div>


            <div class="action-item">

                <div class="action-label">
                    Цель лечения
                </div>

                <div class="action-value">

                    ${
                        game.nightActions.doctorTarget
                            ? escapeHtml(
                                getPlayer(
                                    game.nightActions.doctorTarget
                                )?.name
                              )
                            : "Не выбрана"
                    }

                </div>

            </div>

        </div>


        <button
            id="btnDoctorAction"
            class="btn secondary full"
        >
            Действие доктора
        </button>


        <div class="action-row">

            <div class="action-item">

                <div class="action-label">
                    Комиссар
                </div>

                <div class="action-value">

                    ${
                        commissioner
                            ? escapeHtml(
                                commissioner.name
                              )
                            : "Нет комиссара"
                    }

                </div>

            </div>


            <div class="action-item">

                <div class="action-label">
                    Проверка
                </div>

                <div class="action-value">

                    ${
                        game.nightActions
                            .commissionerTarget
                            ? escapeHtml(
                                getPlayer(
                                    game.nightActions
                                        .commissionerTarget
                                )?.name
                              )
                            : "Не выбрана"
                    }

                </div>

            </div>

        </div>


        <button
            id="btnCommissionerAction"
            class="btn secondary full"
        >
            Проверка комиссара
        </button>


        <button
            id="btnResolveNight"
            class="btn primary full"
            style="margin-top:8px"
        >
            Завершить ночь
        </button>

    `;


    $("btnMafiaAction")
        .addEventListener(
            "click",
            chooseMafiaTarget
        );


    $("btnDoctorAction")
        .addEventListener(
            "click",
            chooseDoctorTarget
        );


    $("btnCommissionerAction")
        .addEventListener(
            "click",
            chooseCommissionerTarget
        );


    $("btnResolveNight")
        .addEventListener(
            "click",
            resolveNight
        );
}


/* =====================================================
   TARGET SELECT
===================================================== */

function buildTargetOptions(
    allowSelf = true,
    excludedId = null
) {

    return getAlivePlayers()
        .filter(player => {

            if (
                excludedId !== null &&
                player.id === Number(excludedId)
            ) {

                return false;
            }

            return true;

        })
        .map(player => {

            return `
                <option value="${player.id}">
                    ${escapeHtml(player.name)}
                    — ${getRoleName(player.role)}
                </option>
            `;

        })
        .join("");
}


/* =====================================================
   MAFIA ACTION
===================================================== */

function chooseMafiaTarget() {

    const mafia =
        game.players.filter(
            player =>
                player.alive &&
                player.role === "mafia"
        );


    if (!mafia.length) {

        alert("В игре нет живой мафии.");

        return;
    }


    const options =
        getAlivePlayers()
            .map(player => {

                return `
                    <option value="${player.id}">
                        ${escapeHtml(player.name)}
                    </option>
                `;

            })
            .join("");


    const target =
        promptSelect(
            "Кого убивает мафия?",
            options
        );


    if (!target) {
        return;
    }


    game.nightActions.mafiaTarget =
        Number(target);


    const player =
        getPlayer(target);


    addEvent(
        `Мафия выбрала цель: ${player.name}.`,
        "night"
    );


    renderGame();
}


/* =====================================================
   DOCTOR ACTION
===================================================== */

function chooseDoctorTarget() {

    const doctor =
        game.players.find(
            player =>
                player.alive &&
                player.role === "doctor"
        );


    if (!doctor) {

        alert("Живого доктора нет.");

        return;
    }


    const players =
        getAlivePlayers()
            .filter(player => {

                if (
                    !game.settings.doctorSelfHeal &&
                    player.id === doctor.id
                ) {

                    return false;
                }

                return true;

            });


    const options =
        players
            .map(player => {

                return `
                    <option value="${player.id}">
                        ${escapeHtml(player.name)}
                    </option>
                `;

            })
            .join("");


    const target =
        promptSelect(
            "Кого лечит доктор?",
            options
        );


    if (!target) {
        return;
    }


    game.nightActions.doctorTarget =
        Number(target);


    const player =
        getPlayer(target);


    addEvent(
        `Доктор выбрал игрока: ${player.name}.`,
        "night"
    );


    renderGame();
}


/* =====================================================
   COMMISSIONER ACTION
===================================================== */

function chooseCommissionerTarget() {

    const commissioner =
        game.players.find(
            player =>
                player.alive &&
                player.role === "commissioner"
        );


    if (!commissioner) {

        alert("Живого комиссара нет.");

        return;
    }


    const options =
        getAlivePlayers()
            .filter(
                player =>
                    player.id !== commissioner.id
            )
            .map(player => {

                return `
                    <option value="${player.id}">
                        ${escapeHtml(player.name)}
                    </option>
                `;

            })
            .join("");


    const target =
        promptSelect(
            "Кого проверяет комиссар?",
            options
        );


    if (!target) {
        return;
    }


    game.nightActions
        .commissionerTarget =
            Number(target);


    const player =
        getPlayer(target);


    const result =
        player.role === "mafia"
            ? "МАФИЯ"
            : "НЕ МАФИЯ";


    alert(
        `Проверка: ${player.name}\n\nРезультат: ${result}`
    );


    addEvent(
        `Комиссар проверил игрока ${player.name}.`,
        "night"
    );


    renderGame();
}


/* =====================================================
   SIMPLE SELECT PROMPT
===================================================== */

function promptSelect(title, options) {

    const value =
        prompt(
            `${title}\n\n` +
            stripHtml(options)
                .replaceAll(
                    "</option>",
                    "\n"
                )
        );


    if (!value) {
        return null;
    }


    const match =
        options.match(
            new RegExp(
                `value="${value}"`,
                "i"
            )
        );


    if (!match) {
        return null;
    }


    return value;
}


function stripHtml(html) {

    const div =
        document.createElement("div");

    div.innerHTML = html;

    return div.textContent;
}


/* =====================================================
   RESOLVE NIGHT
===================================================== */

function resolveNight() {

    if (game.phase !== "night") {
        return;
    }


    const mafiaTarget =
        game.nightActions.mafiaTarget;


    const doctorTarget =
        game.nightActions.doctorTarget;


    if (!mafiaTarget) {

        alert(
            "Мафия ещё не выбрала цель."
        );

        return;
    }


    const victim =
        getPlayer(mafiaTarget);


    const doctorSaved =
        Number(mafiaTarget) ===
        Number(doctorTarget);


    if (doctorSaved) {

        addEvent(
            `${victim.name} был спасён доктором.`,
            "night"
        );

    } else {

        victim.alive = false;

        victim.eliminatedReason =
            "Убит мафией";

        victim.eliminatedAt =
            new Date().toISOString();


        addEvent(
            `${victim.name} убит мафией.`,
            "night"
        );

    }


    game.nightActions = {

        mafiaTarget: null,

        doctorTarget: null,

        commissionerTarget: null

    };


    checkWinner();


    if (!game.finished) {

        game.phase = "day";

        addEvent(
            `Начался день ${game.round}.`
        );

    }


    renderGame();
}


/* =====================================================
   VOTING
===================================================== */

$("btnVoting")
    .addEventListener(
        "click",
        openVoting
    );


function openVoting() {

    if (game.finished) {
        return;
    }


    if (game.phase !== "day") {

        alert(
            "Голосование доступно только днём."
        );

        return;
    }


    renderVotingModal();

    $("votingModal")
        .classList.add("active");
}


function renderVotingModal() {

    const alive =
        getAlivePlayers();


    $("voterSelect").innerHTML =
        alive.map(player => {

            return `
                <option value="${player.id}">
                    ${escapeHtml(player.name)}
                </option>
            `;

        }).join("");


    $("candidateSelect").innerHTML =
        alive.map(player => {

            return `
                <option value="${player.id}">
                    ${escapeHtml(player.name)}
                </option>
            `;

        }).join("");
}


$("btnCancelVote")
    .addEventListener(
        "click",
        () => {

            $("votingModal")
                .classList.remove("active");

        }
    );


$("btnSaveVote")
    .addEventListener(
        "click",
        saveVote
    );


function saveVote() {

    const voterId =
        Number($("voterSelect").value);


    const candidateId =
        Number($("candidateSelect").value);


    if (voterId === candidateId) {

        alert(
            "Игрок не может голосовать за себя."
        );

        return;
    }


    const voter =
        getPlayer(voterId);


    const candidate =
        getPlayer(candidateId);


    const existing =
        game.votes.find(
            vote =>
                vote.voterId === voterId &&
                vote.round === game.round
        );


    if (existing) {

        existing.candidateId =
            candidateId;

        existing.candidateName =
            candidate.name;

    } else {

        game.votes.push({

            voterId,

            voterName:
                voter.name,

            candidateId,

            candidateName:
                candidate.name,

            round:
                game.round,

            createdAt:
                new Date().toISOString()

        });

    }


    addEvent(
        `${voter.name} проголосовал за ${candidate.name}.`,
        "vote"
    );


    $("votingModal")
        .classList.remove("active");


    renderGame();
}


/* =====================================================
   VOTING DATA
===================================================== */

function getCurrentVotes() {

    const votes =
        game.votes.filter(
            vote =>
                vote.round === game.round
        );


    const result = {};


    game.players.forEach(player => {

        result[player.id] = 0;

    });


    votes.forEach(vote => {

        if (
            result[vote.candidateId] !== undefined
        ) {

            result[vote.candidateId]++;

        }

    });


    return result;
}


/* =====================================================
   RENDER VOTING
===================================================== */

function renderVoting() {

    const container =
        $("votingContainer");


    const votes =
        getCurrentVotes();


    const currentVotes =
        game.votes.filter(
            vote =>
                vote.round === game.round
        );


    if (!currentVotes.length) {

        container.innerHTML = `
            <div class="empty-state">
                Голосов пока нет.
                <br><br>

                Нажмите «Голосование»,
                чтобы добавить голос.
            </div>
        `;

        return;
    }


    let html = "";


    getAlivePlayers().forEach(player => {

        html += `

            <div class="vote-summary">

                <div class="vote-name">
                    ${escapeHtml(player.name)}
                </div>

                <div class="vote-count">
                    ${votes[player.id] || 0}
                </div>

            </div>

        `;

    });


    html += `

        <div class="vote-total">

            Всего голосов:
            ${currentVotes.length}

        </div>

        <button
            id="btnFinishVoting"
            class="btn primary full"
            style="margin-top:10px"
        >
            Завершить голосование
        </button>

    `;


    container.innerHTML =
        html;


    $("btnFinishVoting")
        .addEventListener(
            "click",
            finishVoting
        );
}


/* =====================================================
   FINISH VOTING
===================================================== */

function finishVoting() {

    const votes =
        getCurrentVotes();


    const alive =
        getAlivePlayers();


    if (!alive.length) {
        return;
    }


    let maxVotes = 0;

    let leaders = [];


    alive.forEach(player => {

        const count =
            votes[player.id] || 0;


        if (count > maxVotes) {

            maxVotes = count;

            leaders = [player];

        } else if (
            count === maxVotes &&
            count > 0
        ) {

            leaders.push(player);

        }

    });


    if (maxVotes === 0) {

        alert(
            "Никто не получил голосов."
        );

        return;
    }


    if (leaders.length > 1) {

        addEvent(
            `Голосование завершено ничьёй. ` +
            `Лидеры: ${leaders
                .map(p => p.name)
                .join(", ")}.`
        );


        alert(
            `Ничья!\n\n` +
            leaders
                .map(
                    p =>
                        `${p.name}: ${votes[p.id]}`
                )
                .join("\n") +
            "\n\nНикто не выбывает."
        );


        game.phase = "night";

        game.round++;


        addEvent(
            `Началась ночь ${game.round}.`
        );


        renderGame();

        return;
    }


    const eliminated =
        leaders[0];


    eliminated.alive = false;

    eliminated.eliminatedReason =
        "Выведен по итогам голосования";

    eliminated.eliminatedAt =
        new Date().toISOString();


    addEvent(
        `${eliminated.name} выбыл по итогам голосования. ` +
        `Получено голосов: ${maxVotes}.`
    );


    checkWinner();


    if (!game.finished) {

        game.phase = "night";

        game.round++;


        game.nightActions = {

            mafiaTarget: null,

            doctorTarget: null,

            commissionerTarget: null

        };


        addEvent(
            `Началась ночь ${game.round}.`
        );

    }


    renderGame();
}


/* =====================================================
   INTERACTIONS
===================================================== */

$("btnAddInteraction")
    .addEventListener(
        "click",
        openInteractionModal
    );


function openInteractionModal() {

    const alive =
        getAlivePlayers();


    $("interactionActor").innerHTML =
        alive.map(player => {

            return `
                <option value="${player.id}">
                    ${escapeHtml(player.name)}
                    — ${getRoleName(player.role)}
                </option>
            `;

        }).join("");


    $("interactionTarget").innerHTML =
        alive.map(player => {

            return `
                <option value="${player.id}">
                    ${escapeHtml(player.name)}
                    — ${getRoleName(player.role)}
                </option>
            `;

        }).join("");


    $("interactionDescription").value =
        "";


    $("interactionModal")
        .classList.add("active");
}


$("btnCancelInteraction")
    .addEventListener(
        "click",
        () => {

            $("interactionModal")
                .classList.remove("active");

        }
    );


$("btnSaveInteraction")
    .addEventListener(
        "click",
        saveInteraction
    );


function saveInteraction() {

    const actorId =
        Number(
            $("interactionActor").value
        );


    const targetId =
        Number(
            $("interactionTarget").value
        );


    const description =
        $("interactionDescription")
            .value
            .trim();


    if (!description) {

        alert(
            "Введите описание взаимодействия."
        );

        return;
    }


    if (actorId === targetId) {

        alert(
            "Игрок не может взаимодействовать сам с собой."
        );

        return;
    }


    const actor =
        getPlayer(actorId);


    const target =
        getPlayer(targetId);


    game.interactions.push({

        actorId,

        actorName:
            actor.name,

        actorRole:
            actor.role,

        targetId,

        targetName:
            target.name,

        targetRole:
            target.role,

        description,

        round:
            game.round,

        phase:
            game.phase,

        createdAt:
            new Date().toISOString()

    });


    addEvent(
        `${actor.name} → ${target.name}: ${description}.`
    );


    $("interactionModal")
        .classList.remove("active");


    renderGame();
}


/* =====================================================
   INTERACTION STATISTICS
===================================================== */

function renderInteractionStats(
    targetId = "interactionStats"
) {

    const container =
        $(targetId);


    if (!game.interactions.length) {

        container.innerHTML = `
            <div class="empty-state">
                Взаимодействий пока нет.
            </div>
        `;

        return;
    }


    const groups = {};


    game.interactions.forEach(item => {

        const key =
            `${item.actorRole}_${item.actorId}_${item.targetId}`;


        if (!groups[key]) {

            groups[key] = {

                actorName:
                    item.actorName,

                actorRole:
                    item.actorRole,

                targetName:
                    item.targetName,

                targetRole:
                    item.targetRole,

                count:
                    0

            };

        }


        groups[key].count++;

    });


    const groupedByRole = {};


    Object.values(groups)
        .forEach(item => {

            if (
                !groupedByRole[item.actorRole]
            ) {

                groupedByRole[item.actorRole] =
                    [];

            }


            groupedByRole[item.actorRole]
                .push(item);

        });


    let html = "";


    Object.keys(groupedByRole)
        .forEach(role => {

            html += `

                <div class="interaction-stat-card">

                    <div class="interaction-role">
                        ${getRoleName(role)}
                    </div>

            `;


            groupedByRole[role]
                .forEach(item => {

                    html += `

                        <div class="interaction-line">

                            <div>

                                ${escapeHtml(
                                    item.actorName
                                )}

                                →

                                ${escapeHtml(
                                    item.targetName
                                )}

                                <div class="player-role">
                                    ${getRoleName(
                                        item.targetRole
                                    )}
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


    container.innerHTML =
        html;
}


/* =====================================================
   HISTORY
===================================================== */

function renderHistory() {

    const container =
        $("historyContainer");


    if (!game.events.length) {

        container.innerHTML = `
            <div class="empty-state">
                История пока пуста.
            </div>
        `;

        return;
    }


    container.innerHTML =
        game.events
            .map(event => {

                return `

                    <div class="history-item">

                        <div class="history-time">

                            ${event.time}

                            ·

                            Раунд ${event.round}

                            ·

                            ${
                                event.phase === "night"
                                    ? "Ночь"
                                    : "День"
                            }

                        </div>

                        <div class="history-text">
                            ${escapeHtml(event.text)}
                        </div>

                    </div>

                `;

            })
            .join("");
}


/* =====================================================
   CHECK WINNER
===================================================== */

function checkWinner() {

    const alive =
        getAlivePlayers();


    const mafia =
        alive.filter(
            player =>
                player.role === "mafia"
        ).length;


    const nonMafia =
        alive.filter(
            player =>
                player.role !== "mafia"
        ).length;


    if (mafia === 0) {

        finishGame(
            "civilians"
        );

        return true;
    }


    if (mafia >= nonMafia) {

        finishGame(
            "mafia"
        );

        return true;
    }


    return false;
}


/* =====================================================
   FINISH GAME
===================================================== */

function finishGame(winner) {

    if (game.finished) {
        return;
    }


    game.finished = true;

    game.started = false;

    game.winner = winner;

    game.phase = "finished";


    if (winner === "mafia") {

        addEvent(
            "Игра окончена. Победила мафия."
        );

    } else {

        addEvent(
            "Игра окончена. Победили мирные."
        );

    }


    renderGame();


    setTimeout(
        showResults,
        250
    );
}


/* =====================================================
   RENDER GAME
===================================================== */

function renderGame() {

    const alive =
        getAlivePlayers();


    const dead =
        game.players.filter(
            player => !player.alive
        );


    $("statTotal").textContent =
        game.players.length;


    $("statAlive").textContent =
        alive.length;


    $("statDead").textContent =
        dead.length;


    $("statRound").textContent =
        game.round;


    if (game.phase === "night") {

        $("phaseTitle").textContent =
            `Ночь ${game.round}`;

    } else if (
        game.phase === "day"
    ) {

        $("phaseTitle").textContent =
            `День ${game.round}`;

    } else if (
        game.phase === "finished"
    ) {

        $("phaseTitle").textContent =
            "Игра окончена";

    } else {

        $("phaseTitle").textContent =
            "Подготовка";

    }


    renderPlayers();

    renderNightActions();

    renderVoting();

    renderHistory();

    renderInteractionStats();
}


/* =====================================================
   RESULTS
===================================================== */

function showResults() {

    const container =
        $("resultsContainer");


    let winnerText =
        "Игра завершена.";


    if (game.winner === "mafia") {

        winnerText =
            "Победила мафия.";

    } else if (
        game.winner === "civilians"
    ) {

        winnerText =
            "Победили мирные.";

    } else if (
        game.winner === "manual"
    ) {

        winnerText =
            "Игра завершена ведущим.";

    }


    $("resultsWinner").textContent =
        winnerText;


    container.innerHTML =
        game.players
            .map(player => {

                return `

                    <div class="result-card">

                        <div class="result-top">

                            <div>

                                <div class="player-name">
                                    ${escapeHtml(
                                        player.name
                                    )}
                                </div>

                                <div class="player-role">
                                    ${getRoleName(
                                        player.role
                                    )}
                                </div>

                            </div>


                            <div class="result-votes">

                                <strong>
                                    ${
                                        game.votes.filter(
                                            vote =>
                                                vote.round ===
                                                game.round &&
                                                vote.candidateId ===
                                                player.id
                                        ).length
                                    }
                                </strong>

                                <span>
                                    голосов
                                </span>

                            </div>

                        </div>


                        <div class="
                            player-status
                            ${player.alive ? "" : "dead"}
                        " style="margin-top:10px">

                            ${
                                player.alive
                                    ? "Остался в игре"
                                    : "Выбыл"
                            }

                        </div>

                    </div>

                `;

            })
            .join("");


    renderInteractionStats(
        "resultsInteractionStats"
    );


    showScreen(
        "screen-results"
    );
}


/* =====================================================
   MANUAL FINISH
===================================================== */

$("btnFinishGame")
    .addEventListener(
        "click",
        () => {

            if (
                !confirm(
                    "Завершить игру вручную?"
                )
            ) {

                return;
            }


            game.winner =
                "manual";


            game.finished =
                true;


            game.started =
                false;


            game.phase =
                "finished";


            addEvent(
                "Игра завершена ведущим."
            );


            showResults();

        }
    );


/* =====================================================
   NEW GAME
===================================================== */

$("btnNewGame")
    .addEventListener(
        "click",
        () => {

            selectedPlayerCount = 6;

            updatePlayerCount();

            showScreen(
                "screen-start"
            );

        }
    );


/* =====================================================
   SETTINGS
===================================================== */

$("btnGameMenu")
    .addEventListener(
        "click",
        () => {

            $("doctorSelfHeal").value =
                game.settings.doctorSelfHeal
                    ? "yes"
                    : "no";


            $("showRoleAfterDeath").value =
                game.settings.showRoleAfterDeath
                    ? "yes"
                    : "no";


            $("menuModal")
                .classList.add("active");

        }
    );


$("btnCloseMenu")
    .addEventListener(
        "click",
        () => {

            game.settings.doctorSelfHeal =
                $("doctorSelfHeal").value ===
                "yes";


            game.settings.showRoleAfterDeath =
                $("showRoleAfterDeath").value ===
                "yes";


            $("menuModal")
                .classList.remove("active");


            renderGame();

        }
    );


/* =====================================================
   CLEAR HISTORY
===================================================== */

$("btnClearHistory")
    .addEventListener(
        "click",
        () => {

            if (
                !confirm(
                    "Очистить историю событий?"
                )
            ) {

                return;
            }


            game.events = [];

            renderHistory();

        }
    );


/* =====================================================
   INITIAL
===================================================== */

updatePlayerCount();

console.log(
    "MAFIA ROOM — game engine initialized"
);
