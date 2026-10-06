/*
==================================================
MAFIA ROOM
Telegram Mini App
Русская версия
==================================================
*/


/* ================================================
   TELEGRAM MINI APP
================================================ */

const tg =
    window.Telegram?.WebApp;


if (tg) {

    tg.ready();

    tg.expand();

}


/* ================================================
   СОСТОЯНИЕ ИГРЫ
================================================ */

const game = {

    players: [],

    events: [],

    winner: null,

    started: false,

    mafiaCount: 0

};


/* ================================================
   ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ
================================================ */

function $(id) {

    return document.getElementById(id);

}


/* ================================================
   ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
================================================ */

function showScreen(screenId) {

    document
        .querySelectorAll(".screen")
        .forEach(
            screen => {

                screen.classList.remove(
                    "active"
                );

            }
        );


    $(screenId)
        .classList.add("active");


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* ================================================
   ЗАЩИТА HTML
================================================ */

function escapeHtml(value) {

    const div =
        document.createElement("div");


    div.textContent =
        value;


    return div.innerHTML;

}


/* ================================================
   СОЗДАНИЕ ПОЛЕЙ ИГРОКОВ
================================================ */

function createPlayers() {

    const count =
        Number(
            $("playerCount").value
        );


    const container =
        $("namesContainer");


    container.innerHTML = "";


    for (
        let i = 0;
        i < count;
        i++
    ) {

        const card =
            document.createElement("div");


        card.className =
            "card";


        card.innerHTML = `

            <label
                for="player-${i}"
            >
                Игрок ${i + 1}
            </label>


            <input
                id="player-${i}"
                class="player-input"
                type="text"
                maxlength="40"
                placeholder="Введите имя"
            >

        `;


        container.appendChild(
            card
        );

    }


    $("namesError")
        .textContent = "";


    showScreen(
        "screen-names"
    );

}


/* ================================================
   ПЕРЕХОД К РОЛЯМ
================================================ */

function goToRoles() {

    const inputs =
        document.querySelectorAll(
            "#namesContainer input"
        );


    const names =
        [...inputs].map(
            input =>
                input.value.trim()
        );


    /*
    Проверяем пустые имена
    */

    if (
        names.some(
            name => !name
        )
    ) {

        $("namesError")
            .textContent =
            "Заполните имена всех игроков.";

        return;

    }


    /*
    Проверяем повторяющиеся имена
    */

    const uniqueNames =
        new Set(
            names.map(
                name =>
                    name.toLowerCase()
            )
        );


    if (
        uniqueNames.size !==
        names.length
    ) {

        $("namesError")
            .textContent =
            "Имена игроков должны отличаться.";

        return;

    }


    const count =
        names.length;


    /*
    ==============================================
    КОЛИЧЕСТВО МАФИИ
    ==============================================

    4–6 игроков  → 1 мафия
    7–10 игроков → 2 мафии
    11–15       → 3 мафии
    */

    if (count >= 11) {

        game.mafiaCount = 3;

    }

    else if (count >= 7) {

        game.mafiaCount = 2;

    }

    else {

        game.mafiaCount = 1;

    }


    /*
    Создаём игроков
    */

    game.players =
        names.map(
            (name, index) => {

                return {

                    id: index + 1,

                    name: name,

                    /*
                    ВАЖНО:

                    Здесь будет храниться
                    системный код роли.

                    mafia
                    commissioner
                    doctor
                    civilian
                    */

                    role: null,

                    alive: true,

                    eliminatedAt: null,

                    eliminationReason: null

                };

            }
        );


    renderRoles();


    showScreen(
        "screen-roles"
    );

}


/* ================================================
   ОТРИСОВКА СОСТАВА РОЛЕЙ
================================================ */

function renderRoles() {

    const count =
        game.players.length;


    const civilians =
        count -
        game.mafiaCount -
        2;


    $("rolesContainer")
        .innerHTML = `

            <div class="role-box">

                <div class="role-name">
                    Мафия
                </div>

                <div class="role-count">
                    ${game.mafiaCount}
                </div>

            </div>


            <div class="role-box">

                <div class="role-name">
                    Комиссар
                </div>

                <div class="role-count">
                    1
                </div>

            </div>


            <div class="role-box">

                <div class="role-name">
                    Доктор
                </div>

                <div class="role-count">
                    1
                </div>

            </div>


            <div class="role-box">

                <div class="role-name">
                    Мирные жители
                </div>

                <div class="role-count">
                    ${civilians}
                </div>

            </div>

        `;

}


/* ================================================
   ПЕРЕМЕШИВАНИЕ
================================================ */

function shuffle(array) {

    const result =
        [...array];


    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );


        [
            result[i],
            result[j]
        ] =
        [
            result[j],
            result[i]
        ];

    }


    return result;

}


/* ================================================
   РАСПРЕДЕЛЕНИЕ РОЛЕЙ
================================================ */

function assignRoles() {

    let roles = [];


    /*
    Мафия
    */

    for (
        let i = 0;
        i < game.mafiaCount;
        i++
    ) {

        roles.push(
            "mafia"
        );

    }


    /*
    Комиссар
    */

    roles.push(
        "commissioner"
    );


    /*
    Доктор
    */

    roles.push(
        "doctor"
    );


    /*
    Остальные мирные
    */

    while (
        roles.length <
        game.players.length
    ) {

        roles.push(
            "civilian"
        );

    }


    /*
    Перемешиваем
    */

    roles =
        shuffle(roles);


    /*
    Назначаем
    */

    game.players
        .forEach(
            (
                player,
                index
            ) => {

                player.role =
                    roles[index];

            }
        );

}


/* ================================================
   ПЕРЕВОД РОЛИ ДЛЯ ЭКРАНА
================================================ */

function getRoleName(role) {

    switch (role) {

        case "mafia":

            return "Мафия";


        case "commissioner":

            return "Комиссар";


        case "doctor":

            return "Доктор";


        case "civilian":

            return "Мирный";


        default:

            return "Неизвестно";

    }

}


/* ================================================
   СОБЫТИЕ
================================================ */

function addEvent(text) {

    game.events.unshift({

        time:
            new Date()
                .toLocaleTimeString(
                    "ru-RU",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                ),

        text: text

    });

}


/* ================================================
   НАЧАЛО ИГРЫ
================================================ */

function startGame() {

    /*
    Распределяем роли
    */

    assignRoles();


    /*
    Очищаем историю
    */

    game.events = [];


    /*
    Сбрасываем победителя
    */

    game.winner = null;


    /*
    Запускаем игру
    */

    game.started = true;


    /*
    Записываем событие
    */

    addEvent(
        "Игра началась."
    );


    /*
    Отрисовываем
    */

    renderGame();


    /*
    Переходим к игре
    */

    showScreen(
        "screen-game"
    );

}


/* ================================================
   ОТРИСОВКА ИГРЫ
================================================ */

function renderGame() {

    /*
    Живые игроки
    */

    const alivePlayers =
        game.players.filter(
            player =>
                player.alive
        );


    /*
    Статистика
    */

    $("totalCount")
        .textContent =
        game.players.length;


    $("aliveCount")
        .textContent =
        alivePlayers.length;


    $("deadCount")
        .textContent =
        game.players.length -
        alivePlayers.length;


    /*
    Список игроков
    */

    $("playersContainer")
        .innerHTML =

        game.players
            .map(
                player => `

                    <div class="player">


                        <div class="player-info">


                            <div class="player-name">

                                ${
                                    escapeHtml(
                                        player.name
                                    )
                                }

                            </div>


                            <div class="player-role">

                                Роль:
                                ${
                                    getRoleName(
                                        player.role
                                    )
                                }

                            </div>


                            <div
                                class="
                                    status
                                    ${
                                        player.alive
                                            ? "alive"
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


                        ${
                            player.alive

                                ? `

                                    <button
                                        class="danger"
                                        onclick="
                                            eliminatePlayer(
                                                ${player.id}
                                            )
                                        "
                                    >
                                        Вывести
                                    </button>

                                `

                                : ""
                        }


                    </div>

                `
            )
            .join("");


    /*
    История
    */

    if (
        game.events.length > 0
    ) {

        $("eventsContainer")
            .innerHTML =

            game.events
                .map(
                    event => `

                        <div class="event">

                            <strong>
                                ${event.time}
                            </strong>

                            —
                            ${
                                escapeHtml(
                                    event.text
                                )
                            }

                        </div>

                    `
                )
                .join("");

    }

    else {

        $("eventsContainer")
            .innerHTML = `

                <div class="event">

                    Событий пока нет

                </div>

            `;

    }

}


/* ================================================
   ВЫБЫТИЕ ИГРОКА
================================================ */

function eliminatePlayer(id) {

    const player =
        game.players.find(
            p =>
                p.id === id
        );


    if (
        !player ||
        !player.alive
    ) {

        return;

    }


    /*
    Запрашиваем причину
    */

    const reason =
        prompt(
            `Причина выбытия игрока "${player.name}"?`,
            "Голосование"
        );


    /*
    Отмена
    */

    if (
        reason === null
    ) {

        return;

    }


    /*
    Меняем состояние
    */

    player.alive =
        false;


    player.eliminatedAt =
        new Date()
            .toISOString();


    player.eliminationReason =
        reason ||
        "Причина не указана";


    /*
    Записываем событие
    */

    addEvent(

        `${player.name} выбыл. ` +
        `Причина: ${player.eliminationReason}`

    );


    /*
    Проверяем победу
    */

    const winner =
        checkWinner();


    if (winner) {

        finishGame(
            winner
        );

    }

    else {

        renderGame();

    }

}


/* ================================================
   ПРОВЕРКА ПОБЕДИТЕЛЯ
================================================ */

function checkWinner() {

    /*
    Все живые игроки
    */

    const alivePlayers =
        game.players.filter(
            player =>
                player.alive
        );


    /*
    Живая мафия
    */

    const aliveMafia =
        alivePlayers.filter(
            player =>
                player.role ===
                "mafia"
        ).length;


    /*
    Живые не-мафиози
    */

    const aliveNonMafia =
        alivePlayers.filter(
            player =>
                player.role !==
                "mafia"
        ).length;


    /*
    ==========================================
    УСЛОВИЕ 1

    Все мафиози устранены.
    Побеждают мирные.
    ==========================================
    */

    if (
        aliveMafia === 0
    ) {

        return "civilians";

    }


    /*
    ==========================================
    УСЛОВИЕ 2

    Мафии столько же,
    сколько остальных игроков,
    либо больше.

    Побеждает мафия.
    ==========================================
    */

    if (
        aliveMafia >=
        aliveNonMafia
    ) {

        return "mafia";

    }


    /*
    Игра продолжается
    */

    return null;

}


/* ================================================
   ЗАВЕРШЕНИЕ ИГРЫ
================================================ */

function finishGame(
    winner
) {

    game.winner =
        winner;


    game.started =
        false;


    addEvent(
        "Игра окончена."
    );


    /*
    Победила мафия
    */

    if (
        winner === "mafia"
    ) {

        $("winnerTitle")
            .textContent =
            "МАФИЯ ПОБЕДИЛА";


        $("winnerSubtitle")
            .textContent =
            "Мафия получила контроль над игрой.";

    }


    /*
    Победили мирные
    */

    else {

        $("winnerTitle")
            .textContent =
            "МИРНЫЕ ПОБЕДИЛИ";


        $("winnerSubtitle")
            .textContent =
            "Все игроки мафии были устранены.";

    }


    showScreen(
        "screen-winner"
    );

}


/* ================================================
   РЕЗУЛЬТАТЫ
================================================ */

function showResults() {

    $("resultsContainer")
        .innerHTML =

        game.players
            .map(
                player => `

                    <div class="card">


                        <div class="player-name">

                            ${
                                escapeHtml(
                                    player.name
                                )
                            }

                        </div>


                        <div class="player-role">

                            Роль:
                            ${
                                getRoleName(
                                    player.role
                                )
                            }

                        </div>


                        <div
                            class="
                                status
                                ${
                                    player.alive
                                        ? "alive"
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


    showScreen(
        "screen-results"
    );

}


/* ================================================
   НОВАЯ ИГРА
================================================ */

function newGame() {

    game.players = [];

    game.events = [];

    game.winner = null;

    game.started = false;

    game.mafiaCount = 0;


    showScreen(
        "screen-start"
    );

}


/* ================================================
   КНОПКИ
================================================ */

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


$("btnNewGame2")
    .addEventListener(
        "click",
        newGame
    );


/* ================================================
   ЗАВЕРШЕНИЕ ИГРЫ ВРУЧНУЮ
================================================ */

$("btnEndGame")
    .addEventListener(
        "click",
        () => {

            const confirmed =
                confirm(
                    "Завершить текущую игру?"
                );


            if (confirmed) {

                newGame();

            }

        }
    );


/* ================================================
   КНОПКИ НАЗАД
================================================ */

document
    .querySelectorAll(
        "[data-back]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    showScreen(
                        button.dataset.back
                    );

                }
            );

        }
    );


/* ================================================
   ПОДДЕРЖКА TELEGRAM BACK BUTTON
================================================ */

if (tg) {

    tg.BackButton.onClick(
        () => {

            const activeScreen =
                document.querySelector(
                    ".screen.active"
                );


            if (
                activeScreen.id ===
                "screen-names"
            ) {

                showScreen(
                    "screen-start"
                );

            }

            else if (
                activeScreen.id ===
                "screen-roles"
            ) {

                showScreen(
                    "screen-names"
                );

            }

            else if (
                activeScreen.id ===
                "screen-game"
            ) {

                return;

            }

            else {

                showScreen(
                    "screen-start"
                );

            }

        }
    );

}


/* ================================================
   ЗАПУСК
================================================ */

console.log(
    "MAFIA ROOM запущен"
);
