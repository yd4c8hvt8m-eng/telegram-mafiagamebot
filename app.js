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
        nightAction: "kill"
    },

    doctor: {
        name: "Доктор",
        nightAction: "heal"
    },

    commissioner: {
        name: "Комиссар",
        nightAction: "check"
    },

    maniac: {
        name: "Маньяк",
        nightAction: "kill"
    },

    mistress: {
        name: "Любовница",
        nightAction: "block"
    },

    civilian: {
        name: "Мирный",
        nightAction: null
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


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let selectedPlayerCount = 6;

let editingPlayerId = null;

let nightActionType = null;


/* =====================================================
   HELPERS
===================================================== */

const $ = id =>
    document.getElementById(id);


function roleName(role) {

    return ROLES[role]?.name ||
        "Не назначена";
}


function getPlayer(id) {

    return state.players.find(
        player =>
            player.id === Number(id)
    );
}


function alive() {

    return state.players.filter(
        player => player.alive
    );
}


function aliveRole(role) {

    return alive().filter(
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

    return new Date().toLocaleTimeString(
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

            screen.classList.remove(
                "active"
            );

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

    $("playerCount").textContent =
        selectedPlayerCount;
}


$("btnCountMinus").addEventListener(
    "click",
    () => {

        if (
            selectedPlayerCount > 6
        ) {

            selectedPlayerCount--;

            updatePlayerCount();

        }

    }
);


$("btnCountPlus").addEventListener(
    "click",
    () => {

        if (
            selectedPlayerCount < 15
        ) {

            selectedPlayerCount++;

            updatePlayerCount();

        }

    }
);


/* =====================================================
   CREATE GAME
===================================================== */

$("btnCreateGame")
    .addEventListener(
        "click",
        createGame
    );


function createGame() {

    state.players =
        Array.from(
            {
                length:
                    selectedPlayerCount
            },

            (_, index) => {

                return {

                    id: index + 1,

                    name:
                        `Игрок ${index + 1}`,

                    role:
                        "civilian",

                    alive: true,

                    eliminatedAt:
                        null,

                    eliminationReason:
                        null

                };

            }
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


    /*
        Начальный рекомендованный состав.

        Ведущий может полностью изменить
        его перед началом.
    */

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


    renderGame();

    showScreen(
        "screen-game"
    );


    addEvent(
        `Создана партия на ${selectedPlayerCount} игроков.`
    );


    renderGame();
}


/* =====================================================
   ROLE CONFIGURATION
===================================================== */

function renderRoleConfig() {

    const labels = [

        [
            "mafia",
            "Мафия",
            "Убивает ночью"
        ],

        [
            "doctor",
            "Доктор",
            "Лечит игрока"
        ],

        [
            "commissioner",
            "Комиссар",
            "Проверяет роль"
        ],

        [
            "maniac",
            "Маньяк",
            "Самостоятельно убивает"
        ],

        [
            "mistress",
            "Любовница",
            "Блокирует действие"
        ],

        [
            "civilian",
            "Мирный",
            "Без ночного действия"
        ]

    ];


    $("roleConfig").innerHTML = `

        <div class="role-config-card">

            ${labels.map(
                ([key, name, hint]) => `

                    <div
                        class="role-config-row"
                    >

                        <div>

                            <span
                                class="role-config-name"
                            >
                                ${name}
                            </span>

                            <span
                                class="role-config-hint"
                            >
                                ${hint}
                            </span>

                        </div>


                        <button
                            class="role-step"
                            data-role-minus="${key}"
                        >
                            −
                        </button>


                        <div class="role-count">
                            ${state.roleConfig[key]}
                        </div>


                        <button
                            class="role-step"
                            data-role-plus="${key}"
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
        ).reduce(
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

        $("btnApplyRoles").disabled =
            false;

    } else {

        status.textContent =
            `Назначено ролей: ${total} / ${state.players.length}. ` +
            `Мафии должно быть минимум 1.`;

        status.className =
            "config-status error";

        $("btnApplyRoles").disabled =
            true;

    }


    document
        .querySelectorAll(
            "[data-role-minus]"
        )
        .forEach(button => {

            button.onclick = () => {

                changeRoleCount(
                    button.dataset.roleMinus,
                    -1
                );

            };

        });


    document
        .querySelectorAll(
            "[data-role-plus]"
        )
        .forEach(button => {

            button.onclick = () => {

                changeRoleCount(
                    button.dataset.rolePlus,
                    1
                );

            };

        });

}


/* =====================================================
   CHANGE ROLE COUNT
===================================================== */

function changeRoleCount(
    role,
    delta
) {

    const current =
        state.roleConfig[role];


    const total =
        Object.values(
            state.roleConfig
        ).reduce(
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


    /*
        В партии должна оставаться
        хотя бы одна мафия.
    */

    if (
        role === "mafia" &&
        current === 1 &&
        delta < 0
    ) {

        return;

    }


    state.roleConfig[role] +=
        delta;


    renderRoleConfig();
}


/* =====================================================
   APPLY ROLES
===================================================== */

$("btnApplyRoles")
    .addEventListener(
        "click",
        applyRoles
    );


function applyRoles() {

    const total =
        Object.values(
            state.roleConfig
        ).reduce(
            (sum, value) =>
                sum + value,
            0
        );


    if (
        total !==
        state.players.length
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
    ).forEach(
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


    /*
        Перемешиваем роли.
    */

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
        ] =
        [
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


$("btnCancelPlayer")
    .onclick = () => {

        $("playerModal")
            .classList.remove(
                "active"
            );

    };


$("btnSavePlayer")
    .onclick = () => {

        const player =
            getPlayer(
                editingPlayerId
            );


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

            alert(
                "Введите имя."
            );

            return;
        }


        const duplicate =
            state.players.some(
                other =>
                    other.id !==
                    player.id &&
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


        player.name =
            name;

        player.role =
            role;


        $("playerModal")
            .classList.remove(
                "active"
            );


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
                                        >
                                            Вывести
                                        </button>
                                    `

                                    :

                                    `
                                        <button
                                            class="secondary"
                                            data-return="${player.id}"
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
        .querySelectorAll(
            "[data-edit]"
        )
        .forEach(button => {

            button.onclick = () => {

                openPlayerEditor(
                    button.dataset.edit
                );

            };

        });


    document
        .querySelectorAll(
            "[data-eliminate]"
        )
        .forEach(button => {

            button.onclick = () => {

                eliminatePlayer(
                    button.dataset.eliminate,
                    "Ручное выбытие"
                );

            };

        });


    document
        .querySelectorAll(
            "[data-return]"
        )
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


    player.alive =
        false;


    player.eliminatedAt =
        new Date()
            .toISOString();


    player.eliminationReason =
        reason;


    addEvent(
        `${player.name} выбыл. ` +
        `Причина: ${reason}.`
    );


    if (
        checkWinner()
    ) {

        return;

    }


    renderGame();

}


/* =====================================================
   RETURN PLAYER
===================================================== */

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


    player.alive =
        true;


    player.eliminatedAt =
        null;


    player.eliminationReason =
        null;


    state.finished =
        false;


    state.winner =
        null;


    addEvent(
        `${player.name} возвращён в игру.`
    );


    renderGame();

}


/* =====================================================
   DAY / NIGHT
===================================================== */

function startDay() {

    if (
        !state.started ||
        state.finished
    ) {

        return;

    }


    state.phase =
        "day";


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


function startNight() {

    if (
        !state.started ||
        state.finished
    ) {

        return;

    }


    state.phase =
        "night";


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


$("btnStartDay")
    .onclick = startDay;


$("btnStartNight")
    .onclick = startNight;


/* =====================================================
   DAY / NIGHT ANIMATION
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


    /*
        Перезапускаем CSS animation.
    */

    void overlay.offsetWidth;


    overlay.classList.add(
        "show"
    );


    setTimeout(
        () => {

            overlay.classList.remove(
                "show"
            );

        },
        2200
    );

}


/* =====================================================
   NIGHT ACTIONS
===================================================== */

function renderNightActions() {

    const box =
        $("nightActionsContainer");


    if (
        state.phase !== "night"
    ) {

        box.innerHTML = `

            <div class="empty">
                Ночные действия доступны только ночью.
            </div>

        `;

        return;

    }


    const actionDefinitions = [

        [
            "mafia",
            "Мафия",
            "Выбирает цель для убийства.",
            "Выбрать цель"
        ],

        [
            "doctor",
            "Доктор",
            "Выбирает игрока для лечения.",
            "Выбрать лечение"
        ],

        [
            "commissioner",
            "Комиссар",
            "Проверяет роль игрока.",
            "Провести проверку"
        ],

        [
            "maniac",
            "Маньяк",
            "Самостоятельно выбирает жертву.",
            "Выбрать жертву"
        ],

        [
            "mistress",
            "Любовница",
            "Блокирует ночное действие.",
            "Выбрать игрока"
        ]

    ];


    box.innerHTML =

        actionDefinitions
            .map(
                ([role, title, description, button]) => {

                    const actors =
                        aliveRole(role);


                    if (!actors.length) {

                        return "";

                    }


                    const completed =
                        state.night[role]
                            .length;


                    return `

                        <div class="action-role">

                            <div>

                                <div
                                    class="action-role-title"
                                >
                                    ${title}
                                </div>

                                <div
                                    class="action-role-sub"
                                >
                                    ${description}
                                </div>

                                <div
                                    class="action-role-sub"
                                >
                                    Выполнено:
                                    ${completed}
                                    / ${actors.length}
                                </div>

                            </div>


                            <button
                                class="secondary"
                                data-night-action="${role}"
                            >
                                ${button}
                            </button>

                        </div>

                    `;

                }
            )
            .join("");


    document
        .querySelectorAll(
            "[data-night-action]"
        )
        .forEach(button => {

            button.onclick = () => {

                openNightAction(
                    button.dataset.nightAction
                );

            };

        });


    box.innerHTML += `

        <button
            id="btnResolveNight"
            class="primary full"
        >
            Завершить ночь
        </button>

    `;


    $("btnResolveNight")
        .onclick =
            resolveNight;

}


/* =====================================================
   OPEN NIGHT ACTION
===================================================== */

function openNightAction(
    role
) {

    nightActionType =
        role;


    const actors =
        aliveRole(role);


    if (!actors.length) {

        alert(
            "Нет живых игроков с этой ролью."
        );

        return;

    }


    /*
        Кто может быть выбран целью
    */

    let targets =
        alive();


    /*
        Доктор не может лечить себя,
        если настройка отключена.
    */

    if (
        role === "doctor" &&
        !state.doctorSelfHeal
    ) {

        /*
            Ограничение будет применяться
            ниже после выбора конкретного
            доктора.
        */

    }


    /*
        Для комиссара нельзя выбирать
        самого себя.
    */

    $("nightActorSelect").innerHTML =

        actors
            .map(
                player => `

                    <option
                        value="${player.id}"
                    >
                        ${escapeHtml(
                            player.name
                        )}
                    </option>

                `
            )
            .join("");


    $("nightModalTitle")
        .textContent =

            role === "mafia"
                ? "Действие мафии"
                : role === "doctor"
                    ? "Действие доктора"
                    : role === "commissioner"
                        ? "Проверка комиссара"
                        : role === "maniac"
                            ? "Действие маньяка"
                            : "Действие любовницы";


    $("nightModalHint")
        .textContent =

            role === "mafia"
                ? "Выберите конкретного игрока-мафию и его цель."
                : role === "doctor"
                    ? "Выберите доктора и игрока, которого он лечит."
                    : role === "commissioner"
                        ? "Выберите комиссара и игрока для проверки."
                        : role === "maniac"
                            ? "Выберите маньяка и его жертву."
                            : "Выберите любовницу и игрока, которого она блокирует.";


    updateNightTargets();


    $("nightModal")
        .classList.add("active");

}


/* =====================================================
   UPDATE NIGHT TARGETS
===================================================== */

$("nightActorSelect")
    .addEventListener(
        "change",
        updateNightTargets
    );


function updateNightTargets() {

    const role =
        nightActionType;


    if (!role) {
        return;
    }


    const actorId =
        Number(
            $("nightActorSelect")
                .value
        );


    const actor =
        getPlayer(actorId);


    let targets =
        alive();


    /*
        Нельзя выбрать себя для:

        комиссара
        любовницы

        Для мафии и маньяка
        также исключаем самого себя.

        Доктор — зависит от настройки.
    */

    if (
        role === "commissioner" ||
        role === "mistress" ||
        role === "mafia" ||
        role === "maniac"
    ) {

        targets =
            targets.filter(
                player =>
                    player.id !== actorId
            );

    }


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


    $("nightTargetSelect")
        .innerHTML =

            targets
                .map(
                    player => `

                        <option
                            value="${player.id}"
                        >
                            ${escapeHtml(
                                player.name
                            )}
                            — ${roleName(
                                player.role
                            )}
                        </option>

                    `
                )
                .join("");

}


/* =====================================================
   SAVE NIGHT ACTION
===================================================== */

$("btnCancelNight")
    .onclick = () => {

        $("nightModal")
            .classList.remove(
                "active"
            );

        nightActionType =
            null;

    };


$("btnSaveNight")
    .onclick =
        saveNightAction;


function saveNightAction() {

    const role =
        nightActionType;


    if (!role) {
        return;
    }


    const actorId =
        Number(
            $("nightActorSelect")
                .value
        );


    const targetId =
        Number(
            $("nightTargetSelect")
                .value
        );


    const actor =
        getPlayer(actorId);


    const target =
        getPlayer(targetId);


    if (
        !actor ||
        !target
    ) {

        alert(
            "Не удалось определить игрока."
        );

        return;

    }


    if (
        actor.id === target.id
    ) {

        alert(
            "Игрок не может выбрать себя."
        );

        return;

    }


    /*
        Проверяем, не совершал ли этот
        игрок уже действие этой ночью.
    */

    const existing =
        state.night[role]
            .find(
                action =>
                    action.actorId ===
                    actorId
            );


    if (existing) {

        existing.targetId =
            targetId;

        existing.targetName =
            target.name;

    } else {

        state.night[role].push({

            actorId,

            actorName:
                actor.name,

            targetId,

            targetName:
                target.name

        });

    }


    addEvent(
        `${roleName(role)} ${actor.name} ` +
        `выбрал игрока ${target.name}.`,
        "night"
    );


    $("nightModal")
        .classList.remove(
            "active"
        );


    nightActionType =
        null;


    renderGame();

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
        Проверяем, есть ли хотя бы
        одно действие.
    */

    const totalActions =
        Object.values(
            state.night
        )
        .reduce(
            (sum, actions) =>
                sum + actions.length,
            0
        );


    if (!totalActions) {

        alert(
            "Не выполнено ни одного ночного действия."
        );

        return;

    }


    /*
        1. Определяем любовниц,
        которые сами не заблокированы.
    */

    const mistressActions =
        state.night.mistress;


    const blockedIds =
        new Set();


    mistressActions.forEach(
        action => {

            /*
                Любовница сама не может
                заблокировать себя.

                Она блокирует выбранного
                игрока.
            */

            blockedIds.add(
                action.targetId
            );

        }
    );


    /*
        2. Определяем действия
        заблокированных игроков.
    */


    /*
        МАФИЯ
    */

    const activeMafia =
        state.night.mafia
            .filter(
                action =>
                    !blockedIds.has(
                        action.actorId
                    )
            );


    /*
        Все мафии должны выбрать
        одну и ту же цель.

        Если голоса разделились
        поровну — убийства нет.
    */

    let mafiaTarget =
        null;


    if (
        activeMafia.length
    ) {

        const targetCounts = {};


        activeMafia.forEach(
            action => {

                targetCounts[
                    action.targetId
                ] =
                    (
                        targetCounts[
                            action.targetId
                        ] || 0
                    ) + 1;

            }
        );


        const max =
            Math.max(
                ...Object.values(
                    targetCounts
                )
            );


        const leaders =
            Object.entries(
                targetCounts
            )
            .filter(
                ([, count]) =>
                    count === max
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
                "Мафия не смогла выбрать единую цель. Убийство не состоялось.",
                "night"
            );

        }

    }


    /*
        МАНЬЯКИ
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
        ДОКТОРЫ
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


    activeDoctors.forEach(
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
        КОМИССАРЫ
    */

    const activeCommissioners =
        state.night.commissioner
            .filter(
                action =>
                    !blockedIds.has(
                        action.actorId
                    )
            );


    activeCommissioners.forEach(
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
                    ? "МАФИЯ"
                    : "НЕ МАФИЯ";


            addEvent(
                `Комиссар проверил ${target.name}. Результат: ${result}.`,
                "night"
            );


            /*
                Показываем ведущему результат.
            */

            alert(
                `Проверка комиссара\n\n` +
                `${target.name}\n\n` +
                `Результат: ${result}`
            );

        }
    );


    /*
        Список всех убийств.
    */

    const kills = [];


    /*
        Убийство мафией.
    */

    if (
        mafiaTarget !== null &&
        !protectedIds.has(
            mafiaTarget
        )
    ) {

        kills.push({

            id:
                mafiaTarget,

            reason:
                "Убит мафией"

        });

    }


    /*
        Убийство маньяками.
    */

    activeManiacs.forEach(
        action => {

            if (
                !protectedIds.has(
                    action.targetId
                )
            ) {

                kills.push({

                    id:
                        action.targetId,

                    reason:
                        "Убит маньяком"

                });

            }

        }
    );


    /*
        Убираем повторные убийства
        одного игрока.
    */

    const uniqueKills =
        new Map();


    kills.forEach(
        kill => {

            if (
                !uniqueKills.has(
                    kill.id
                )
            ) {

                uniqueKills.set(
                    kill.id,
                    kill
                );

            }

        }
    );


    /*
        Применяем убийства.
    */

    uniqueKills.forEach(
        kill => {

            const victim =
                getPlayer(
                    kill.id
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
        Очищаем ночные действия.
    */

    state.night = {

        mafia: [],

        doctor: [],

        commissioner: [],

        maniac: [],

        mistress: []

    };


    /*
        Проверяем победу.
    */

    if (
        checkWinner()
    ) {

        return;

    }


    /*
        Переходим к дню.
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

$("btnVoting")
    .onclick =
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
        alive();


    const candidates =
        alive();


    $("voterSelect")
        .innerHTML =

            voters
                .map(
                    player => `

                        <option
                            value="${player.id}"
                        >
                            ${escapeHtml(
                                player.name
                            )}
                        </option>

                    `
                )
                .join("");


    $("candidateSelect")
        .innerHTML =

            candidates
                .map(
                    player => `

                        <option
                            value="${player.id}"
                        >
                            ${escapeHtml(
                                player.name
                            )}
                        </option>

                    `
                )
                .join("");


    $("votingModal")
        .classList.add(
            "active"
        );

}


$("btnCancelVote")
    .onclick = () => {

        $("votingModal")
            .classList.remove(
                "active"
            );

    };


$("btnSaveVote")
    .onclick =
        saveVote;


function saveVote() {

    const voterId =
        Number(
            $("voterSelect")
                .value
        );


    const candidateId =
        Number(
            $("candidateSelect")
                .value
        );


    if (
        voterId ===
        candidateId
    ) {

        alert(
            "Нельзя голосовать за себя."
        );

        return;

    }


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


    /*
        Один игрок может иметь
        только один голос за раунд.

        Если голос уже был —
        изменяем его.
    */

    const existing =
        state.votes.find(
            vote =>
                vote.voterId ===
                    voterId &&
                vote.round ===
                    state.round
        );


    if (existing) {

        existing.candidateId =
            candidateId;


        existing.candidateName =
            candidate.name;


        addEvent(
            `${voter.name} изменил голос на ${candidate.name}.`,
            "vote"
        );

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


        addEvent(
            `${voter.name} проголосовал за ${candidate.name}.`,
            "vote"
        );

    }


    $("votingModal")
        .classList.remove(
            "active"
        );


    renderGame();

}


/* =====================================================
   GET VOTES
===================================================== */

function getVotes() {

    const result = {};


    alive().forEach(
        player => {

            result[player.id] =
                0;

        }
    );


    state.votes
        .filter(
            vote =>
                vote.round ===
                state.round
        )
        .forEach(
            vote => {

                if (
                    result[
                        vote.candidateId
                    ] !== undefined
                ) {

                    result[
                        vote.candidateId
                    ]++;

                }

            }
        );


    return result;
}


/* =====================================================
   FINISH VOTING
===================================================== */

function finishVoting() {

    const votes =
        getVotes();


    let max =
        0;


    let leaders =
        [];


    alive().forEach(
        player => {

            const count =
                votes[player.id] || 0;


            if (
                count > max
            ) {

                max =
                    count;

                leaders =
                    [player];

            } else if (
                count === max &&
                count > 0
            ) {

                leaders.push(
                    player
                );

            }

        }
    );


    if (
        max === 0
    ) {

        alert(
            "Никто не получил голосов."
        );

        return;

    }


    /*
        Ничья.
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
            `Ничья.\n\n` +
            `Никто не выбывает.`
        );


        state.round++;


        startNight();


        return;

    }


    /*
        Один победитель голосования.
    */

    const eliminated =
        leaders[0];


    eliminated.alive =
        false;


    eliminated.eliminatedAt =
        new Date()
            .toISOString();


    eliminated.eliminationReason =
        "Выведен по итогам голосования";


    addEvent(
        `${eliminated.name} выбыл по голосованию. ` +
        `Получено голосов: ${max}.`
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
   RENDER VOTING
===================================================== */

function renderVoting() {

    const box =
        $("votingContainer");


    const currentVotes =
        state.votes.filter(
            vote =>
                vote.round ===
                state.round
        );


    const counts =
        getVotes();


    if (
        !currentVotes.length
    ) {

        box.innerHTML = `

            <div class="empty">

                Голосование ещё
                не проводилось
                в этом раунде.

            </div>

        `;

        return;

    }


    box.innerHTML =

        alive()
            .map(
                player => `

                    <div class="vote-row">

                        <span>
                            ${escapeHtml(
                                player.name
                            )}
                        </span>

                        <span class="vote-count">
                            ${
                                counts[
                                    player.id
                                ] || 0
                            }
                        </span>

                    </div>

                `
            )
            .join("")


        +


        `

            <div class="vote-total">

                Проголосовало:
                ${currentVotes.length}
                из
                ${alive().length}

            </div>


            <button
                id="btnFinishVoting"
                class="primary full"
            >
                Завершить голосование
            </button>


            <div class="vote-list">

                ${currentVotes
                    .map(
                        vote => `

                            <div class="vote-detail">

                                ${escapeHtml(
                                    vote.voterName
                                )}

                                →

                                ${escapeHtml(
                                    vote.candidateName
                                )}

                            </div>

                        `
                    )
                    .join("")}

            </div>

        `;


    $("btnFinishVoting")
        .onclick =
            finishVoting;

}


/* =====================================================
   INTERACTIONS
===================================================== */

$("btnAddInteraction")
    .onclick =
        openInteraction;


function openInteraction() {

    const players =
        alive();


    $("interactionActor")
        .innerHTML =

            players
                .map(
                    player => `

                        <option
                            value="${player.id}"
                        >
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


    $("interactionTarget")
        .innerHTML =

            players
                .map(
                    player => `

                        <option
                            value="${player.id}"
                        >
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
        .classList.add(
            "active"
        );

}


$("btnCancelInteraction")
    .onclick = () => {

        $("interactionModal")
            .classList.remove(
                "active"
            );

    };


$("btnSaveInteraction")
    .onclick =
        saveInteraction;


function saveInteraction() {

    const actorId =
        Number(
            $("interactionActor")
                .value
        );


    const targetId =
        Number(
            $("interactionTarget")
                .value
        );


    const description =
        $("interactionDescription")
            .value
            .trim();


    if (
        actorId ===
        targetId
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
        `${actor.name} → ` +
        `${target.name}: ` +
        `${description}.`
    );


    $("interactionModal")
        .classList.remove(
            "active"
        );


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


    state.interactions.forEach(
        interaction => {

            const key =
                `${interaction.actorRole}|` +
                `${interaction.actorId}|` +
                `${interaction.targetId}`;


            if (!map[key]) {

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
                    !byRole[
                        item.actorRole
                    ]
                ) {

                    byRole[
                        item.actorRole
                    ] = [];

                }


                byRole[
                    item.actorRole
                ].push(
                    item
                );

            }
        );


    box.innerHTML =

        Object.entries(
            byRole
        )
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

                            <div
                                class="event-time"
                            >

                                ${event.time}

                                ·

                                Раунд
                                ${event.round}

                                ·

                                ${
                                    event.phase ===
                                    "night"

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
   WINNER
===================================================== */

function checkWinner() {

    const players =
        alive();


    const mafia =
        players.filter(
            player =>
                player.role ===
                "mafia"
        ).length;


    const nonMafia =
        players.length -
        mafia;


    /*
        Мафия уничтожена.
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
        Мафия получила
        численное равенство.
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

function finishGame(
    winner
) {

    if (
        state.finished
    ) {

        return;

    }


    state.finished =
        true;


    state.started =
        false;


    state.phase =
        "finished";


    state.winner =
        winner;


    if (
        winner ===
        "mafia"
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
   RENDER GAME
===================================================== */

function renderGame() {

    const players =
        alive();


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


    if (
        state.phase ===
        "night"
    ) {

        $("phaseTitle")
            .textContent =
                `Ночь ${state.round}`;

    } else if (
        state.phase ===
        "day"
    ) {

        $("phaseTitle")
            .textContent =
                `День ${state.round}`;

    } else if (
        state.phase ===
        "finished"
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
        Панель ролей показываем
        только до начала игры.
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
   RESULTS
===================================================== */

function renderResults() {

    let winnerText =
        "Игра завершена.";


    if (
        state.winner ===
        "mafia"
    ) {

        winnerText =
            "Победила мафия.";

    } else if (
        state.winner ===
        "civilians"
    ) {

        winnerText =
            "Победили мирные.";

    } else if (
        state.winner ===
        "manual"
    ) {

        winnerText =
            "Игра завершена ведущим.";

    }


    $("resultsWinner")
        .textContent =
            winnerText;


    /*
        Считаем голоса за игрока
        за всю игру.
    */

    const voteTotals = {};


    state.players.forEach(
        player => {

            voteTotals[player.id] =
                state.votes.filter(
                    vote =>
                        vote.candidateId ===
                        player.id
                ).length;

        }
    );


    $("resultsContainer")
        .innerHTML =

            state.players
                .map(
                    player => `

                        <div class="result-card">

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

$("btnGameMenu")
    .onclick = () => {

        $("doctorSelfHeal").value =
            state.doctorSelfHeal
                ? "yes"
                : "no";


        $("showRoleAfterDeath").value =
            state.showRoleAfterDeath
                ? "yes"
                : "no";


        $("menuModal")
            .classList.add(
                "active"
            );

    };


$("btnCloseMenu")
    .onclick = () => {

        state.doctorSelfHeal =
            $("doctorSelfHeal")
                .value ===
            "yes";


        state.showRoleAfterDeath =
            $("showRoleAfterDeath")
                .value ===
            "yes";


        $("menuModal")
            .classList.remove(
                "active"
            );


        renderGame();

    };


/* =====================================================
   END GAME
===================================================== */

$("btnEndGame")
    .onclick = () => {

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

$("btnNewGame")
    .onclick = () => {

        selectedPlayerCount =
            6;


        updatePlayerCount();


        showScreen(
            "screen-start"
        );

    };


/* =====================================================
   INITIALIZE
===================================================== */

updatePlayerCount();


console.log(
    "MAFIA ROOM — game engine initialized"
);
