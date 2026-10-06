/* =====================================================
   TELEGRAM
===================================================== */

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}


/* =====================================================
   ROLES
===================================================== */

const ROLES = {

    mafia: {
        name: "Мафия",
        actionName: "Убийство",
        nightAction: true
    },

    doctor: {
        name: "Доктор",
        actionName: "Лечение",
        nightAction: true
    },

    commissioner: {
        name: "Комиссар",
        actionName: "Проверка",
        nightAction: true
    },

    maniac: {
        name: "Маньяк",
        actionName: "Убийство",
        nightAction: true
    },

    mistress: {
        name: "Любовница",
        actionName: "Блокировка",
        nightAction: true
    },

    civilian: {
        name: "Мирный",
        actionName: null,
        nightAction: false
    }

};


/* =====================================================
   STATE
===================================================== */

const state = {

    players: [],

    events: [],

    interactions: [],

    votes: [],

    round: 1,

    phase: "setup",

    winner: null,

    started: false,

    finished: false,

    roleConfig: {

        mafia: 1,

        doctor: 1,

        commissioner: 1,

        maniac: 0,

        mistress: 0,

        civilian: 0

    },

    night: {

        mafia: [],

        doctor: [],

        commissioner: [],

        maniac: [],

        mistress: []

    },

    doctorSelfHeal: true,

    showRoleAfterDeath: true

};


let selectedPlayerCount = 6;

let editingPlayerId = null;


/* =====================================================
   DOM
===================================================== */

function $(id) {
    return document.getElementById(id);
}


/* =====================================================
   HELPERS
===================================================== */

function roleName(role) {

    return ROLES[role]?.name || "Не назначена";

}


function getPlayer(id) {

    return state.players.find(
        player =>
            player.id === Number(id)
    );

}


function alivePlayers() {

    return state.players.filter(
        player =>
            player.alive
    );

}


function aliveRole(role) {

    return alivePlayers().filter(
        player =>
            player.role === role
    );

}


function escapeHtml(value) {

    return String(value ?? "")

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");

}


function timeNow() {

    return new Date()
        .toLocaleTimeString(
            "ru-RU",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

}


/* =====================================================
   SCREEN
===================================================== */

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


/* =====================================================
   HISTORY
===================================================== */

function addEvent(
    text,
    type = "game"
) {

    state.events.unshift({

        time: timeNow(),

        text,

        type,

        round: state.round,

        phase: state.phase

    });

}


/* =====================================================
   PLAYER COUNT
===================================================== */

function updatePlayerCount() {

    $("playerCount")
        .textContent =
        selectedPlayerCount;

}


$("btnCountMinus").onclick = () => {

    if (selectedPlayerCount > 6) {

        selectedPlayerCount--;

        updatePlayerCount();

    }

};


$("btnCountPlus").onclick = () => {

    if (selectedPlayerCount < 15) {

        selectedPlayerCount++;

        updatePlayerCount();

    }

};


/* =====================================================
   CREATE GAME
===================================================== */

$("btnCreateGame").onclick = createGame;


function createGame() {

    state.players =
        Array.from(
            {
                length: selectedPlayerCount
            },
            (_, index) => ({

                id: index + 1,

                name:
                    `Игрок ${index + 1}`,

                role:
                    "civilian",

                alive:
                    true,

                eliminatedAt:
                    null,

                eliminationReason:
                    null

            })
        );


    state.events = [];

    state.interactions = [];

    state.votes = [];

    state.round = 1;

    state.phase = "setup";

    state.winner = null;

    state.started = false;

    state.finished = false;


    state.night = {

        mafia: [],

        doctor: [],

        commissioner: [],

        maniac: [],

        mistress: []

    };


    const recommendedMafia =
        selectedPlayerCount >= 8
            ? 2
            : 1;


    state.roleConfig = {

        mafia:
            recommendedMafia,

        doctor:
            1,

        commissioner:
            1,

        maniac:
            0,

        mistress:
            0,

        civilian:
            selectedPlayerCount -
            recommendedMafia -
            2

    };


    addEvent(
        `Создана партия на ${selectedPlayerCount} игроков.`
    );


    renderGame();

    showScreen("screen-game");

}


/* =====================================================
   ROLE CONFIG
===================================================== */

function renderRoleConfig() {

    const roles = [

        [
            "mafia",
            "Мафия",
            "Убийство"
        ],

        [
            "doctor",
            "Доктор",
            "Лечение"
        ],

        [
            "commissioner",
            "Комиссар",
            "Проверка"
        ],

        [
            "maniac",
            "Маньяк",
            "Самостоятельное убийство"
        ],

        [
            "mistress",
            "Любовница",
            "Блокировка"
        ],

        [
            "civilian",
            "Мирный",
            "Без ночного действия"
        ]

    ];


    $("roleConfig").innerHTML = `

        <div class="role-config-card">

            ${roles.map(
                ([key, name, hint]) => `

                    <div class="role-config-row">

                        <div>

                            <span class="role-config-name">
                                ${name}
                            </span>

                            <span class="role-config-hint">
                                ${hint}
                            </span>

                        </div>


                        <button
                            class="role-step"
                            data-role-minus="${key}"
                            type="button"
                        >
                            −
                        </button>


                        <div class="role-count">

                            ${state.roleConfig[key]}

                        </div>


                        <button
                            class="role-step"
                            data-role-plus="${key}"
                            type="button"
                        >
                            +
                        </button>

                    </div>

                `
            ).join("")}

        </div>

    `;


    const total =
        Object.values(
            state.roleConfig
        )
        .reduce(
            (sum, value) =>
                sum + value,
            0
        );


    const status =
        $("roleConfigStatus");


    if (

        total === state.players.length &&

        state.roleConfig.mafia > 0

    ) {

        status.textContent =
            `Состав готов: ${total} / ${state.players.length}`;

        status.className =
            "config-status ok";

        $("btnApplyRoles").disabled = false;

    } else {

        status.textContent =
            `Назначено ролей: ${total} / ${state.players.length}. ` +
            `Мафии должно быть минимум 1.`;

        status.className =
            "config-status error";

        $("btnApplyRoles").disabled = true;

    }


    document
        .querySelectorAll("[data-role-minus]")
        .forEach(button => {

            button.onclick = () => {

                changeRoleCount(
                    button.dataset.roleMinus,
                    -1
                );

            };

        });


    document
        .querySelectorAll("[data-role-plus]")
        .forEach(button => {

            button.onclick = () => {

                changeRoleCount(
                    button.dataset.rolePlus,
                    1
                );

            };

        });

}


function changeRoleCount(
    role,
    delta
) {

    const current =
        state.roleConfig[role];


    const total =
        Object.values(
            state.roleConfig
        )
        .reduce(
            (sum, value) =>
                sum + value,
            0
        );


    if (
        delta > 0 &&
        total >= state.players.length
    ) {

        return;

    }


    if (
        delta < 0 &&
        current <= 0
    ) {

        return;

    }


    if (
        role === "mafia" &&
        current === 1 &&
        delta < 0
    ) {

        return;

    }


    state.roleConfig[role] += delta;


    renderRoleConfig();

}


/* =====================================================
   APPLY ROLES
===================================================== */

$("btnApplyRoles").onclick = applyRoles;


function applyRoles() {

    const total =
        Object.values(
            state.roleConfig
        )
        .reduce(
            (sum, value) =>
                sum + value,
            0
        );


    if (
        total !== state.players.length
    ) {

        alert(
            "Количество ролей должно совпадать с количеством игроков."
        );

        return;

    }


    if (
        state.roleConfig.mafia < 1
    ) {

        alert(
            "В игре должна быть хотя бы одна мафия."
        );

        return;

    }


    const roles = [];


    Object.entries(
        state.roleConfig
    )
    .forEach(
        ([role, count]) => {

            for (
                let i = 0;
                i < count;
                i++
            ) {

                roles.push(role);

            }

        }
    );


    for (
        let i = roles.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );


        [
            roles[i],
            roles[j]
        ] = [
            roles[j],
            roles[i]
        ];

    }


    state.players.forEach(
        (player, index) => {

            player.role =
                roles[index];

        }
    );


    state.started = true;

    state.finished = false;

    state.phase = "day";


    addEvent(
        "Состав ролей применён. Игра началась."
    );


    renderGame();


    showPhaseOverlay(
        "day",
        `ДЕНЬ ${state.round}`,
        "Игра начинается"
    );

}


/* =====================================================
   PLAYER EDITOR
===================================================== */

function openPlayerEditor(id) {

    const player =
        getPlayer(id);


    if (!player) {
        return;
    }


    editingPlayerId =
        player.id;


    $("playerNameInput").value =
        player.name;


    $("playerRoleInput").innerHTML =

        Object.entries(ROLES)
            .map(
                ([key, role]) => `

                    <option
                        value="${key}"
                        ${
                            key === player.role
                                ? "selected"
                                : ""
                        }
                    >
                        ${role.name}
                    </option>

                `
            )
            .join("");


    $("playerModal")
        .classList.add("active");

}


$("btnCancelPlayer").onclick = () => {

    $("playerModal")
        .classList.remove("active");

};


$("btnSavePlayer").onclick = () => {

    const player =
        getPlayer(editingPlayerId);


    if (!player) {
        return;
    }


    const name =
        $("playerNameInput")
            .value
            .trim();


    const role =
        $("playerRoleInput")
            .value;


    if (!name) {

        alert("Введите имя.");

        return;

    }


    const duplicate =
        state.players.some(
            other =>

                other.id !== player.id &&

                other.name
                    .toLowerCase() ===
                name.toLowerCase()
        );


    if (duplicate) {

        alert(
            "Такое имя уже используется."
        );

        return;

    }


    if (
        player.name !== name
    ) {

        addEvent(
            `Имя изменено: ${player.name} → ${name}.`
        );

    }


    if (
        player.role !== role
    ) {

        addEvent(
            `Роль ${name}: ` +
            `${roleName(player.role)} → ` +
            `${roleName(role)}.`
        );

    }


    player.name = name;

    player.role = role;


    $("playerModal")
        .classList.remove("active");


    renderGame();

};


/* =====================================================
   RENDER PLAYERS
===================================================== */

function renderPlayers() {

    $("playersContainer").innerHTML =

        state.players
            .map(
                (player, index) => {

                    const visibleRole =

                        (
                            !player.alive &&
                            !state.showRoleAfterDeath
                        )

                            ?

                            "Роль скрыта"

                            :

                            roleName(
                                player.role
                            );


                    return `

                        <div class="player">

                            <div class="player-main">

                                <div class="player-number">
                                    Игрок ${index + 1}
                                </div>


                                <div class="player-name">

                                    ${escapeHtml(
                                        player.name
                                    )}

                                </div>


                                <div class="player-role">

                                    ${visibleRole}

                                </div>


                                <div
                                    class="
                                        status
                                        ${
                                            player.alive
                                                ? ""
                                                : "dead"
                                        }
                                    "
                                >

                                    ${
                                        player.alive
                                            ? "● В игре"
                                            : "☠ Выбыл"
                                    }

                                </div>

                            </div>


                            <div class="player-actions">

                                <button
                                    class="secondary"
                                    data-edit="${player.id}"
                                    type="button"
                                >
                                    Изменить
                                </button>


                                ${
                                    player.alive

                                        ?

                                        `
                                            <button
                                                class="danger"
                                                data-eliminate="${player.id}"
                                                type="button"
                                            >
                                                Вывести
                                            </button>
                                        `

                                        :

                                        `
                                            <button
                                                class="secondary"
                                                data-return="${player.id}"
                                                type="button"
                                            >
                                                Вернуть
                                            </button>
                                        `
                                }

                            </div>

                        </div>

                    `;

                }
            )
            .join("");


    document
        .querySelectorAll("[data-edit]")
        .forEach(button => {

            button.onclick = () => {

                openPlayerEditor(
                    button.dataset.edit
                );

            };

        });


    document
        .querySelectorAll("[data-eliminate]")
        .forEach(button => {

            button.onclick = () => {

                eliminatePlayer(
                    button.dataset.eliminate,
                    "Ручное выбытие"
                );

            };

        });


    document
        .querySelectorAll("[data-return]")
        .forEach(button => {

            button.onclick = () => {

                returnPlayer(
                    button.dataset.return
                );

            };

        });

}


/* =====================================================
   ELIMINATE PLAYER
===================================================== */

function eliminatePlayer(
    id,
    reason
) {

    const player =
        getPlayer(id);


    if (
        !player ||
        !player.alive
    ) {

        return;

    }


    if (
        !confirm(
            `Вывести игрока «${player.name}»?`
        )
    ) {

        return;

    }


    player.alive = false;


    player.eliminatedAt =
        new Date().toISOString();


    player.eliminationReason =
        reason;


    addEvent(
        `${player.name} выбыл. Причина: ${reason}.`
    );


    if (
        checkWinner()
    ) {

        return;

    }


    renderGame();

}


function returnPlayer(id) {

    const player =
        getPlayer(id);


    if (
        !player ||
        player.alive
    ) {

        return;

    }


    if (
        !confirm(
            `Вернуть «${player.name}» в игру?`
        )
    ) {

        return;

    }


    player.alive = true;

    player.eliminatedAt = null;

    player.eliminationReason = null;

    state.finished = false;

    state.winner = null;


    addEvent(
        `${player.name} возвращён в игру.`
    );


    renderGame();

}


/* =====================================================
   DAY
===================================================== */

function startDay() {

    if (
        !state.started ||
        state.finished
    ) {

        return;

    }


    state.phase = "day";


    addEvent(
        `Начался день ${state.round}.`
    );


    renderGame();


    showPhaseOverlay(
        "day",
        `ДЕНЬ ${state.round}`,
        "Город просыпается"
    );

}


$("btnStartDay").onclick = startDay;


/* =====================================================
   NIGHT
===================================================== */

function startNight() {

    if (
        !state.started ||
        state.finished
    ) {

        return;

    }


    state.phase = "night";


    state.night = {

        mafia: [],

        doctor: [],

        commissioner: [],

        maniac: [],

        mistress: []

    };


    addEvent(
        `Началась ночь ${state.round}.`
    );


    renderGame();


    showPhaseOverlay(
        "night",
        `НОЧЬ ${state.round}`,
        "Город засыпает"
    );

}


$("btnStartNight").onclick = startNight;


/* =====================================================
   PHASE ANIMATION
===================================================== */

function showPhaseOverlay(
    type,
    title,
    subtitle
) {

    const overlay =
        $("phaseOverlay");


    overlay.className =
        `phase-overlay ${type}`;


    $("phaseOverlayIcon")
        .textContent =
        type === "night"
            ? "☾"
            : "☀";


    $("phaseOverlayTitle")
        .textContent =
        title;


    $("phaseOverlaySubtitle")
        .textContent =
        subtitle;


    void overlay.offsetWidth;


    overlay.classList.add("show");


    setTimeout(
        () => {

            overlay.classList.remove("show");

        },
        2200
    );

}


/* =====================================================
   NIGHT TARGETS
===================================================== */

function getNightTargets(
    role,
    actorId
) {

    let targets =
        alivePlayers();


    /*
        Мафия
    */

    if (
        role === "mafia"
    ) {

        targets =
            targets.filter(
                player =>
                    player.id !== actorId
            );

    }


    /*
        Доктор
    */

    if (
        role === "doctor" &&
        !state.doctorSelfHeal
    ) {

        targets =
            targets.filter(
                player =>
                    player.id !== actorId
            );

    }


    /*
        Комиссар
    */

    if (
        role === "commissioner"
    ) {

        targets =
            targets.filter(
                player =>
                    player.id !== actorId
            );

    }


    /*
        Маньяк
    */

    if (
        role === "maniac"
    ) {

        targets =
            targets.filter(
                player =>
                    player.id !== actorId
            );

    }


    /*
        Любовница
    */

    if (
        role === "mistress"
    ) {

        targets =
            targets.filter(
                player =>
                    player.id !== actorId
            );

    }


    return targets;

}


/* =====================================================
   NIGHT ACTIONS
   НОВАЯ ЛОГИКА:
   SELECT СРАЗУ СОХРАНЯЕТ ЦЕЛЬ
===================================================== */

function renderNightActions() {

    const box =
        $("nightActionsContainer");


    if (
        state.phase !== "night"
    ) {

        box.innerHTML = `

            <div class="empty">

                Ночные действия доступны
                только во время ночи.

            </div>

        `;

        return;

    }


    const roles = [

        {
            key: "mafia",

            title: "Мафия",

            description:
                "Каждый живой игрок-мафия выбирает цель."
        },

        {
            key: "doctor",

            title: "Доктор",

            description:
                "Доктор выбирает игрока для лечения."
        },

        {
            key: "commissioner",

            title: "Комиссар",

            description:
                "Комиссар выбирает игрока для проверки."
        },

        {
            key: "maniac",

            title: "Маньяк",

            description:
                "Маньяк выбирает игрока для убийства."
        },

        {
            key: "mistress",

            title: "Любовница",

            description:
                "Любовница выбирает игрока для блокировки."
        }

    ];


    let html = "";


    roles.forEach(
        roleInfo => {

            const actors =
                aliveRole(
                    roleInfo.key
                );


            if (
                !actors.length
            ) {

                return;

            }


            html += `

                <div
                    class="role-night-block"
                >

                    <div
                        class="night-role-header"
                    >

                        <div
                            class="action-role-title"
                        >
                            ${roleInfo.title}
                        </div>

                        <div
                            class="action-role-sub"
                        >
                            ${roleInfo.description}
                        </div>

                    </div>

            `;


            actors.forEach(
                actor => {

                    const savedAction =
                        state.night[
                            roleInfo.key
                        ]
                        .find(
                            action =>
                                action.actorId ===
                                actor.id
                        );


                    const targets =
                        getNightTargets(
                            roleInfo.key,
                            actor.id
                        );


                    const selectedTarget =
                        savedAction
                            ? savedAction.targetId
                            : "";


                    html += `

                        <div
                            class="night-player-action"
                        >

                            <div
                                class="night-player-name"
                            >

                                ${escapeHtml(
                                    actor.name
                                )}

                            </div>


                            <select
                                id="
                                    night-target-${roleInfo.key}-${actor.id}
                                "
                                class="night-target-select"
                                data-night-role="${roleInfo.key}"
                                data-night-actor="${actor.id}"
                            >

                                <option value="">

                                    Выберите цель

                                </option>


                                ${
                                    targets
                                        .map(
                                            target => `

                                                <option
                                                    value="${target.id}"
                                                    ${
                                                        Number(
                                                            selectedTarget
                                                        ) ===
                                                        Number(
                                                            target.id
                                                        )
                                                            ? "selected"
                                                            : ""
                                                    }
                                                >

                                                    ${escapeHtml(
                                                        target.name
                                                    )}

                                                    —

                                                    ${roleName(
                                                        target.role
                                                    )}

                                                </option>

                                            `
                                        )
                                        .join("")
                                }

                            </select>


                            ${
                                savedAction

                                    ?

                                    `
                                        <div
                                            class="night-target-saved"
                                        >
                                            ✓ Цель выбрана
                                        </div>
                                    `

                                    :

                                    ""
                            }

                        </div>

                    `;

                }
            );


            html += `

                </div>

            `;

        }
    );


    html += `

        <button
            id="btnResolveNight"
            type="button"
            class="primary full night-finish-button"
        >
            Завершить ночь
        </button>

    `;


    box.innerHTML = html;


    /*
        ВАЖНО:

        Цель сохраняется СРАЗУ после
        изменения выпадающего списка.
    */

    box
        .querySelectorAll(
            "[data-night-role]"
        )
        .forEach(select => {

            select.addEventListener(
                "change",
                function () {

                    const role =
                        this.dataset.nightRole;


                    const actorId =
                        Number(
                            this.dataset.nightActor
                        );


                    const targetId =
                        Number(
                            this.value
                        );


                    if (!targetId) {

                        return;

                    }


                    saveNightAction(
                        role,
                        actorId,
                        targetId
                    );

                }
            );

        });


    $("btnResolveNight")
        .onclick =
        resolveNight;

}


/* =====================================================
   SAVE NIGHT ACTION
===================================================== */

function saveNightAction(
    role,
    actorId,
    targetId
) {

    const actor =
        getPlayer(actorId);


    const target =
        getPlayer(targetId);


    if (
        !actor ||
        !target
    ) {

        return;

    }


    if (!actor.alive) {

        alert(
            "Этот игрок уже выбыл."
        );

        return;

    }


    if (!target.alive) {

        alert(
            "Нельзя выбрать выбывшего игрока."
        );

        return;

    }


    /*
        Самого себя может выбрать
        только доктор, если разрешено.
    */

    if (
        actor.id === target.id
    ) {

        if (
            !(
                role === "doctor" &&
                state.doctorSelfHeal
            )
        ) {

            alert(
                "Этот игрок не может выбрать себя."
            );

            renderNightActions();

            return;

        }

    }


    const actions =
        state.night[role];


    const existing =
        actions.find(
            action =>
                action.actorId === actorId
        );


    if (existing) {

        existing.targetId =
            targetId;

        existing.targetName =
            target.name;

    } else {

        actions.push({

            actorId:
                actorId,

            actorName:
                actor.name,

            targetId:
                targetId,

            targetName:
                target.name

        });

    }


    /*
        Перерисовываем ночные действия,
        чтобы появилась отметка
        "✓ Цель выбрана".
    */

    renderNightActions();

}


/* =====================================================
   RESOLVE NIGHT
===================================================== */

function resolveNight() {

    if (
        state.phase !== "night"
    ) {

        return;

    }


    /*
        Проверяем все активные роли.
    */

    const requiredActors = {

        mafia:
            aliveRole("mafia"),

        doctor:
            aliveRole("doctor"),

        commissioner:
            aliveRole("commissioner"),

        maniac:
            aliveRole("maniac"),

        mistress:
            aliveRole("mistress")

    };


    for (
        const role of Object.keys(
            requiredActors
        )
    ) {

        const required =
            requiredActors[role];


        if (
            required.length === 0
        ) {

            continue;

        }


        const actions =
            state.night[role];


        const completedActorIds =
            new Set(

                actions.map(
                    action =>
                        action.actorId
                )

            );


        const missing =
            required.filter(
                player =>
                    !completedActorIds.has(
                        player.id
                    )
            );


        if (
            missing.length
        ) {

            alert(

                `${roleName(role)}: ` +
                `не выбрали цель:\n\n` +

                missing
                    .map(
                        player =>
                            player.name
                    )
                    .join("\n")

            );


            return;

        }

    }


    /*
        =============================================
        1. ЛЮБОВНИЦА
        =============================================
    */

    const blockedIds =
        new Set();


    state.night.mistress
        .forEach(
            action => {

                blockedIds.add(
                    action.targetId
                );

            }
        );


    /*
        =============================================
        2. МАФИЯ
        =============================================

        Если несколько мафий выбирают
        разные цели, считается большинство.

        Например:

        Мафия 1 → Игрок 7
        Мафия 2 → Игрок 7
        Мафия 3 → Игрок 4

        Игрок 7 = 2
        Игрок 4 = 1

        Игрок 7 погибает.

        При равенстве убийства нет.
    */

    const activeMafia =
        state.night.mafia
            .filter(
                action =>
                    !blockedIds.has(
                        action.actorId
                    )
            );


    let mafiaTarget =
        null;


    if (
        activeMafia.length
    ) {

        const counts = {};


        activeMafia
            .forEach(
                action => {

                    counts[
                        action.targetId
                    ] =

                        (
                            counts[
                                action.targetId
                            ] || 0
                        ) + 1;

                }
            );


        const maxVotes =
            Math.max(
                ...Object.values(
                    counts
                )
            );


        const leaders =
            Object.entries(
                counts
            )
            .filter(
                ([, count]) =>
                    count === maxVotes
            );


        if (
            leaders.length === 1
        ) {

            mafiaTarget =
                Number(
                    leaders[0][0]
                );

        } else {

            addEvent(
                "Мафия не смогла выбрать единую цель. " +
                "Убийство не состоялось.",
                "night"
            );

        }

    }


    /*
        =============================================
        3. ДОКТОР
        =============================================
    */

    const activeDoctors =
        state.night.doctor
            .filter(
                action =>
                    !blockedIds.has(
                        action.actorId
                    )
            );


    const protectedIds =
        new Set();


    activeDoctors
        .forEach(
            action => {

                protectedIds.add(
                    action.targetId
                );


                const target =
                    getPlayer(
                        action.targetId
                    );


                if (target) {

                    addEvent(
                        `${target.name} защищён доктором.`,
                        "night"
                    );

                }

            }
        );


    /*
        =============================================
        4. КОМИССАР
        =============================================
    */

    const activeCommissioners =
        state.night.commissioner
            .filter(
                action =>
                    !blockedIds.has(
                        action.actorId
                    )
            );


    activeCommissioners
        .forEach(
            action => {

                const target =
                    getPlayer(
                        action.targetId
                    );


                if (!target) {
                    return;
                }


                const result =

                    target.role === "mafia"

                        ?

                        "МАФИЯ"

                        :

                        "НЕ МАФИЯ";


                addEvent(
                    `Комиссар проверил ${target.name}.`,
                    "night"
                );


                alert(

                    `Проверка комиссара\n\n` +

                    `${target.name}\n\n` +

                    `Результат: ${result}`

                );

            }
        );


    /*
        =============================================
        5. МАНЬЯК
        =============================================
    */

    const activeManiacs =
        state.night.maniac
            .filter(
                action =>
                    !blockedIds.has(
                        action.actorId
                    )
            );


    /*
        =============================================
        6. ФОРМИРУЕМ СПИСОК УБИЙСТВ
        =============================================
    */

    const kills = [];


    /*
        Убийство мафии.
    */

    if (

        mafiaTarget !== null &&

        !protectedIds.has(
            mafiaTarget
        )

    ) {

        kills.push({

            playerId:
                mafiaTarget,

            reason:
                "Убит мафией"

        });

    }


    /*
        Убийство маньяка.
    */

    activeManiacs
        .forEach(
            action => {

                if (
                    !protectedIds.has(
                        action.targetId
                    )
                ) {

                    kills.push({

                        playerId:
                            action.targetId,

                        reason:
                            "Убит маньяком"

                    });

                }

            }
        );


    /*
        Если несколько убийств
        пришлись на одного игрока,
        выводим его один раз.
    */

    const uniqueKills =
        new Map();


    kills.forEach(
        kill => {

            if (
                !uniqueKills.has(
                    kill.playerId
                )
            ) {

                uniqueKills.set(
                    kill.playerId,
                    kill
                );

            }

        }
    );


    /*
        =============================================
        7. ПРИМЕНЯЕМ УБИЙСТВА
        =============================================
    */

    uniqueKills
        .forEach(
            kill => {

                const victim =
                    getPlayer(
                        kill.playerId
                    );


                if (
                    !victim ||
                    !victim.alive
                ) {

                    return;

                }


                victim.alive =
                    false;


                victim.eliminatedAt =
                    new Date()
                        .toISOString();


                victim.eliminationReason =
                    kill.reason;


                addEvent(
                    `${victim.name} выбыл ночью. ` +
                    `Причина: ${kill.reason}.`,
                    "night"
                );

            }
        );


    /*
        =============================================
        8. ИТОГ НОЧИ
        =============================================
    */

    if (
        uniqueKills.size === 0
    ) {

        addEvent(
            "Ночь завершилась. Жертв нет.",
            "night"
        );

    } else {

        const victims =
            Array.from(
                uniqueKills.values()
            )
            .map(
                kill => {

                    const player =
                        getPlayer(
                            kill.playerId
                        );

                    return player
                        ? player.name
                        : "";

                }
            )
            .filter(Boolean);


        addEvent(
            `Итог ночи: выбыл — ${victims.join(", ")}.`,
            "night"
        );

    }


    /*
        =============================================
        9. ОЧИЩАЕМ НОЧНЫЕ ДЕЙСТВИЯ
        =============================================
    */

    state.night = {

        mafia: [],

        doctor: [],

        commissioner: [],

        maniac: [],

        mistress: []

    };


    /*
        =============================================
        10. ПРОВЕРКА ПОБЕДЫ
        =============================================
    */

    if (
        checkWinner()
    ) {

        return;

    }


    /*
        =============================================
        11. ПЕРЕХОД КО ДНЮ
        =============================================
    */

    state.phase =
        "day";


    addEvent(
        `Начался день ${state.round}.`
    );


    renderGame();


    showPhaseOverlay(
        "day",
        `ДЕНЬ ${state.round}`,
        "Наступило утро"
    );

}


/* =====================================================
   VOTING
===================================================== */

$("btnVoting").onclick =
    openVoting;


function openVoting() {

    if (
        !state.started ||
        state.finished
    ) {

        return;

    }


    if (
        state.phase !== "day"
    ) {

        alert(
            "Голосование доступно только днём."
        );

        return;

    }


    const voters =
        alivePlayers();


    const candidates =
        alivePlayers();


    $("voterSelect").innerHTML =

        voters
            .map(
                player => `

                    <option value="${player.id}">

                        ${escapeHtml(
                            player.name
                        )}

                    </option>

                `
            )
            .join("");


    $("candidateSelect").innerHTML =

        candidates
            .map(
                player => `

                    <option value="${player.id}">

                        ${escapeHtml(
                            player.name
                        )}

                    </option>

                `
            )
            .join("");


    $("votingModal")
        .classList.add("active");

}


$("btnCancelVote").onclick = () => {

    $("votingModal")
        .classList.remove("active");

};


$("btnSaveVote").onclick =
    saveVote;


function saveVote() {

    const voterId =
        Number(
            $("voterSelect").value
        );


    const candidateId =
        Number(
            $("candidateSelect").value
        );


    const voter =
        getPlayer(voterId);


    const candidate =
        getPlayer(candidateId);


    if (
        !voter ||
        !candidate
    ) {

        return;

    }


    if (!voter.alive) {

        alert(
            "Выбывший игрок не может голосовать."
        );

        return;

    }


    if (!candidate.alive) {

        alert(
            "Нельзя голосовать за выбывшего игрока."
        );

        return;

    }


    if (
        voterId === candidateId
    ) {

        alert(
            "Нельзя голосовать за себя."
        );

        return;

    }


    const existing =
        state.votes.find(
            vote =>

                vote.voterId === voterId &&

                vote.round === state.round
        );


    if (existing) {

        existing.candidateId =
            candidateId;

        existing.candidateName =
            candidate.name;

    } else {

        state.votes.push({

            voterId,

            voterName:
                voter.name,

            candidateId,

            candidateName:
                candidate.name,

            round:
                state.round,

            createdAt:
                new Date()
                    .toISOString()

        });

    }


    /*
        Нам НЕ нужно показывать:
        кто за кого проголосовал.

        Сохраняем это только внутри state.
    */


    $("votingModal")
        .classList.remove("active");


    renderGame();

}


/* =====================================================
   VOTE COUNTS
===================================================== */

function getCurrentVoteCounts() {

    const counts = {};


    alivePlayers()
        .forEach(
            player => {

                counts[player.id] = 0;

            }
        );


    state.votes
        .filter(
            vote =>
                vote.round === state.round
        )
        .forEach(
            vote => {

                if (
                    counts[vote.candidateId]
                    !== undefined
                ) {

                    counts[vote.candidateId]++;

                }

            }
        );


    return counts;

}


/* =====================================================
   RENDER VOTING
===================================================== */

function renderVoting() {

    const box =
        $("votingContainer");


    const currentVotes =
        state.votes.filter(
            vote =>
                vote.round === state.round
        );


    const counts =
        getCurrentVoteCounts();


    if (
        !currentVotes.length
    ) {

        box.innerHTML = `

            <div class="empty">

                Голосование ещё не началось.

            </div>

        `;

        return;

    }


    const sorted =
        alivePlayers()
            .sort(
                (a, b) =>

                    (
                        counts[b.id] || 0
                    )

                    -

                    (
                        counts[a.id] || 0
                    )
            );


    box.innerHTML = `

        <div class="vote-summary">

            ${sorted
                .map(
                    player => `

                        <div class="vote-row">

                            <span>

                                ${escapeHtml(
                                    player.name
                                )}

                            </span>


                            <strong class="vote-count">

                                ${
                                    counts[
                                        player.id
                                    ] || 0
                                }

                            </strong>

                        </div>

                    `
                )
                .join("")}


            <div class="vote-total">

                Проголосовало:
                ${currentVotes.length}
                из
                ${alivePlayers().length}

            </div>


            <button
                id="btnFinishVoting"
                type="button"
                class="primary full"
            >
                Завершить голосование
            </button>

        </div>

    `;


    $("btnFinishVoting")
        .onclick =
        finishVoting;

}


/* =====================================================
   FINISH VOTING
===================================================== */

function finishVoting() {

    const counts =
        getCurrentVoteCounts();


    let maxVotes = 0;

    let leaders = [];


    alivePlayers()
        .forEach(
            player => {

                const count =
                    counts[player.id] || 0;


                if (
                    count > maxVotes
                ) {

                    maxVotes =
                        count;

                    leaders =
                        [player];

                } else if (

                    count === maxVotes &&

                    count > 0

                ) {

                    leaders.push(player);

                }

            }
        );


    if (
        maxVotes === 0
    ) {

        alert(
            "Никто не получил голосов."
        );

        return;

    }


    /*
        НИЧЬЯ
    */

    if (
        leaders.length > 1
    ) {

        addEvent(
            `Ничья голосования: ` +
            `${leaders
                .map(
                    player =>
                        player.name
                )
                .join(", ")}.`
        );


        alert(
            "Ничья.\n\nНикто не выбывает."
        );


        state.round++;


        startNight();

        return;

    }


    /*
        ПОБЕДИТЕЛЬ ГОЛОСОВАНИЯ
    */

    const eliminated =
        leaders[0];


    eliminated.alive =
        false;


    eliminated.eliminatedAt =
        new Date().toISOString();


    eliminated.eliminationReason =
        "Выведен по итогам голосования";


    addEvent(
        `${eliminated.name} выбыл по голосованию. ` +
        `Получено голосов: ${maxVotes}.`
    );


    if (
        checkWinner()
    ) {

        return;

    }


    state.round++;


    startNight();

}


/* =====================================================
   INTERACTIONS
===================================================== */

$("btnAddInteraction").onclick =
    openInteraction;


function openInteraction() {

    const players =
        alivePlayers();


    $("interactionActor").innerHTML =

        players
            .map(
                player => `

                    <option value="${player.id}">

                        ${escapeHtml(
                            player.name
                        )}

                        —
                        ${roleName(
                            player.role
                        )}

                    </option>

                `
            )
            .join("");


    $("interactionTarget").innerHTML =

        players
            .map(
                player => `

                    <option value="${player.id}">

                        ${escapeHtml(
                            player.name
                        )}

                        —
                        ${roleName(
                            player.role
                        )}

                    </option>

                `
            )
            .join("");


    $("interactionDescription")
        .value = "";


    $("interactionModal")
        .classList.add("active");

}


$("btnCancelInteraction").onclick = () => {

    $("interactionModal")
        .classList.remove("active");

};


$("btnSaveInteraction").onclick =
    saveInteraction;


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


    if (
        actorId === targetId
    ) {

        alert(
            "Выберите разных игроков."
        );

        return;

    }


    if (!description) {

        alert(
            "Введите описание."
        );

        return;

    }


    const actor =
        getPlayer(actorId);


    const target =
        getPlayer(targetId);


    if (
        !actor ||
        !target
    ) {

        return;

    }


    state.interactions.push({

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
            state.round,

        phase:
            state.phase

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

function renderInteractions(
    targetId = "interactionStats"
) {

    const box =
        $(targetId);


    if (
        !state.interactions.length
    ) {

        box.innerHTML = `

            <div class="empty">

                Взаимодействий пока нет.

            </div>

        `;

        return;

    }


    const map = {};


    state.interactions
        .forEach(
            interaction => {

                const key =
                    `${interaction.actorId}|` +
                    `${interaction.targetId}`;


                if (
                    !map[key]
                ) {

                    map[key] = {

                        actorName:
                            interaction.actorName,

                        actorRole:
                            interaction.actorRole,

                        targetName:
                            interaction.targetName,

                        targetRole:
                            interaction.targetRole,

                        count:
                            0

                    };

                }


                map[key].count++;

            }
        );


    const byRole = {};


    Object.values(map)
        .forEach(
            item => {

                if (
                    !byRole[item.actorRole]
                ) {

                    byRole[item.actorRole] = [];

                }


                byRole[item.actorRole]
                    .push(item);

            }
        );


    box.innerHTML =

        Object.entries(byRole)
            .map(
                ([role, items]) => `

                    <div
                        class="interaction-stat-card"
                    >

                        <div
                            class="interaction-role"
                        >

                            ${roleName(role)}

                        </div>


                        ${items
                            .map(
                                item => `

                                    <div
                                        class="interaction-line"
                                    >

                                        <span>

                                            ${escapeHtml(
                                                item.actorName
                                            )}

                                            →

                                            ${escapeHtml(
                                                item.targetName
                                            )}

                                            <br>

                                            <small>

                                                ${roleName(
                                                    item.targetRole
                                                )}

                                            </small>

                                        </span>


                                        <span
                                            class="interaction-count"
                                        >

                                            ${item.count}
                                            раз

                                        </span>

                                    </div>

                                `
                            )
                            .join("")}

                    </div>

                `
            )
            .join("");

}


/* =====================================================
   HISTORY
===================================================== */

function renderHistory() {

    $("eventsContainer")
        .innerHTML =

            state.events.length

                ?

                state.events
                    .map(
                        event => `

                            <div class="event">

                                <div class="event-time">

                                    ${event.time}

                                    ·

                                    Раунд
                                    ${event.round}

                                    ·

                                    ${
                                        event.phase === "night"
                                            ? "Ночь"
                                            : "День"
                                    }

                                </div>


                                ${escapeHtml(
                                    event.text
                                )}

                            </div>

                        `
                    )
                    .join("")

                :

                `

                    <div class="empty">

                        История пока пуста.

                    </div>

                `;

}


/* =====================================================
   CHECK WINNER
===================================================== */

function checkWinner() {

    const players =
        alivePlayers();


    const mafia =
        players.filter(
            player =>
                player.role === "mafia"
        ).length;


    const nonMafia =
        players.length - mafia;


    /*
        Мафия полностью уничтожена.
    */

    if (
        mafia === 0
    ) {

        finishGame(
            "civilians"
        );

        return true;

    }


    /*
        Мафия получила равенство
        или большинство.
    */

    if (
        mafia >= nonMafia
    ) {

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

    if (
        state.finished
    ) {

        return;

    }


    state.finished = true;

    state.started = false;

    state.phase = "finished";

    state.winner = winner;


    if (
        winner === "mafia"
    ) {

        addEvent(
            "Игра окончена. Победила мафия."
        );

    } else {

        addEvent(
            "Игра окончена. Победили мирные."
        );

    }


    renderResults();


    showScreen(
        "screen-results"
    );

}


/* =====================================================
   RESULTS
===================================================== */

function renderResults() {

    let winnerText =
        "Игра завершена.";


    if (
        state.winner === "mafia"
    ) {

        winnerText =
            "Победила мафия.";

    }


    if (
        state.winner === "civilians"
    ) {

        winnerText =
            "Победили мирные.";

    }


    if (
        state.winner === "manual"
    ) {

        winnerText =
            "Игра завершена ведущим.";

    }


    $("resultsWinner")
        .textContent =
        winnerText;


    const voteTotals = {};


    state.players
        .forEach(
            player => {

                voteTotals[player.id] =

                    state.votes
                        .filter(
                            vote =>
                                vote.candidateId ===
                                player.id
                        )
                        .length;

            }
        );


    $("resultsContainer")
        .innerHTML =

            state.players
                .map(
                    player => `

                        <div
                            class="result-card"
                        >

                            <div
                                class="result-top"
                            >

                                <div>

                                    <div
                                        class="player-name"
                                    >

                                        ${escapeHtml(
                                            player.name
                                        )}

                                    </div>


                                    <div
                                        class="player-role"
                                    >

                                        ${
                                            (
                                                !player.alive &&
                                                !state.showRoleAfterDeath
                                            )

                                                ?

                                                "Роль скрыта"

                                                :

                                                roleName(
                                                    player.role
                                                )
                                        }

                                    </div>

                                </div>


                                <div
                                    class="result-votes"
                                >

                                    <strong>

                                        ${
                                            voteTotals[
                                                player.id
                                            ]
                                        }

                                    </strong>


                                    <span>
                                        голосов
                                    </span>

                                </div>

                            </div>


                            <div
                                class="
                                    status
                                    ${
                                        player.alive
                                            ? ""
                                            : "dead"
                                    }
                                "
                            >

                                ${
                                    player.alive
                                        ? "Остался в игре"
                                        : "Выбыл"
                                }

                            </div>

                        </div>

                    `
                )
                .join("");


    renderInteractions(
        "resultsInteractionStats"
    );

}


/* =====================================================
   SETTINGS
===================================================== */

$("btnGameMenu").onclick = () => {

    $("doctorSelfHeal").value =

        state.doctorSelfHeal
            ? "yes"
            : "no";


    $("showRoleAfterDeath").value =

        state.showRoleAfterDeath
            ? "yes"
            : "no";


    $("menuModal")
        .classList.add("active");

};


$("btnCloseMenu").onclick = () => {

    state.doctorSelfHeal =

        $("doctorSelfHeal").value ===
        "yes";


    state.showRoleAfterDeath =

        $("showRoleAfterDeath").value ===
        "yes";


    $("menuModal")
        .classList.remove("active");


    renderGame();

};


/* =====================================================
   END GAME
===================================================== */

$("btnEndGame").onclick = () => {

    if (
        !confirm(
            "Завершить игру?"
        )
    ) {

        return;

    }


    state.winner =
        "manual";


    state.finished =
        true;


    state.started =
        false;


    state.phase =
        "finished";


    addEvent(
        "Игра завершена ведущим."
    );


    renderResults();


    showScreen(
        "screen-results"
    );

};


/* =====================================================
   NEW GAME
===================================================== */

$("btnNewGame").onclick = () => {

    selectedPlayerCount = 6;

    updatePlayerCount();

    showScreen(
        "screen-start"
    );

};


/* =====================================================
   RENDER GAME
===================================================== */

function renderGame() {

    const players =
        alivePlayers();


    $("totalCount")
        .textContent =
        state.players.length;


    $("aliveCount")
        .textContent =
        players.length;


    $("deadCount")
        .textContent =

            state.players.length -
            players.length;


    $("roundCount")
        .textContent =
        state.round;


    /*
        Заголовок фазы.
    */

    if (
        state.phase === "night"
    ) {

        $("phaseTitle")
            .textContent =
            `Ночь ${state.round}`;

    } else if (
        state.phase === "day"
    ) {

        $("phaseTitle")
            .textContent =
            `День ${state.round}`;

    } else if (
        state.phase === "finished"
    ) {

        $("phaseTitle")
            .textContent =
            "Игра окончена";

    } else {

        $("phaseTitle")
            .textContent =
            "Подготовка";

    }


    /*
        Панель настройки ролей
        показываем до начала игры.
    */

    $("setupPanel").style.display =

        state.started
            ? "none"
            : "block";


    if (
        !state.started
    ) {

        renderRoleConfig();

    }


    renderPlayers();

    renderNightActions();

    renderVoting();

    renderHistory();

    renderInteractions();

}


/* =====================================================
   INIT
===================================================== */

updatePlayerCount();


console.log(
    "MAFIA ROOM — приложение запущено"
);
