/*
==================================================
MAFIA ROOM
Telegram Mini App

Язык приложения: русский

Версия: 1.0
==================================================
*/


/* ==================================================
   TELEGRAM MINI APP
================================================== */

const tg = window.Telegram?.WebApp;


if (tg) {

    tg.ready();

    tg.expand();

}


/* ==================================================
   СОСТОЯНИЕ ИГРЫ
================================================== */

const game = {

    players: [],

    events: [],

    winner: null,

    started: false,

    mafiaCount: 0

};


/* ==================================================
   ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ DOM
================================================== */

function $(id) {

    return document.getElementById(id);

}


/* ==================================================
   ПЕРЕКЛЮЧЕНИЕ ЭКРАНА
================================================== */

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


/* ==================================================
   ЗАЩИТА ОТ HTML
================================================== */

function escapeHtml(value) {

    const div =
        document.createElement("div");


    div.textContent =
        value;


    return div.innerHTML;

}


/* ==================================================
   ЭКРАН 1
   ВЫБОР КОЛИЧЕСТВА ИГРОКОВ
================================================== */

function createPlayers() {

    const count =
        Number(
            $("playerCount").value
        );


    const container =
        $("namesContainer");


    container.innerHTML = "";


    /*
    Создаём поля для каждого игрока
    */

    for (
        let i = 0;
        i < count;
        i++
    ) {

        const card =
            document.createElement(
                "div"
            );


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
                autocomplete="off"
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


/* ==================================================
   ЭКРАН 2
   ПОЛУЧЕНИЕ ИМЁН
================================================== */

function goToRoles() {

    const inputs =
        document.querySelectorAll(
            "#namesContainer input"
        );


    const names =
        [...inputs]
            .map(
                input =>
                    input.value.trim()
            );


    /*
    Проверка пустых имён
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
    Проверка одинаковых имён
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
    ОПРЕДЕЛЯЕМ КОЛИЧЕСТВО МАФИИ
    ==============================================

    4–6 игроков
    1 мафия

    7–10 игроков
    2 мафии

    11–15 игроков
    3 мафии
    */

    if (
        count >= 11
    ) {

        game.mafiaCount = 3;

    }

    else if (
        count >= 7
    ) {

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

                    id:
                        index + 1,

                    name:
                        name,

                    /*
                    Системное значение роли.

                    Важно:
                    здесь не хранится
                    "Мафия" или "Доктор".

                    Здесь хранится:
                    mafia
                    commissioner
                    doctor
                    civilian
                    */

                    role:
                        null,

                    alive:
                        true,

                    eliminatedAt:
                        null,

                    eliminationReason:
                        null

                };

            }
        );


    /*
    Показываем состав ролей
    */

    renderRoles();


    showScreen(
        "screen-roles"
    );

}


/* ==================================================
   СОСТАВ РОЛЕЙ
================================================== */

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


/* ==================================================
   ПЕРЕМЕШИВАНИЕ МАССИВА
================================================== */

function shuffle(array) {

    const result =
        [...array];


    for (
        let i =
            result.length - 1;

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


/* ==================================================
   НАЗНАЧЕНИЕ РОЛЕЙ
================================================== */

function assignRoles() {

    let roles = [];


    /*
    Добавляем мафию
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
    Добавляем комиссара
    */

    roles.push(
        "commissioner"
    );


    /*
    Добавляем доктора
    */

    roles.push(
        "doctor"
    );


    /*
    Остальные игроки —
    мирные
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
    Перемешиваем роли
    */

    roles =
        shuffle(roles);


    /*
    Назначаем роли игрокам
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


/* ==================================================
   ПОЛУЧИТЬ НАЗВАНИЕ РОЛИ
================================================== */

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


/* ==================================================
   ДОБАВИТЬ СОБЫТИЕ
================================================== */

function addEvent(text) {

    game.events.unshift({

        time:
            new Date()
                .toLocaleTimeString(
                    "ru-RU",
                    {
                        hour:
                            "2-digit",

                        minute:
                            "2-digit"
                    }
                ),

        text:
            text

    });

}


/* ==================================================
   НАЧАЛО ИГРЫ
================================================== */

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
    Меняем состояние
    */

    game.started = true;


    /*
    Записываем событие
    */

    addEvent(
        "Игра началась."
    );


    /*
    Отрисовываем игру
    */

    renderGame();


    /*
    Переходим на экран игры
    */

    showScreen(
        "screen-game"
    );

}


/* ==================================================
   ОТРИСОВКА ИГРЫ
================================================== */

function renderGame() {

    /*
    Получаем живых игроков
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
    ==============================================
    СПИСОК ИГРОКОВ
    ==============================================
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
    ==============================================
    ИСТОРИЯ
    ==============================================
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


/* ==================================================
   ВЫБЫТИЕ ИГРОКА
================================================== */

function eliminatePlayer(id) {

    const player =
        game.players.find(
            p =>
                p.id === id
        );


    /*
    Игрок не найден
    */

    if (!player) {

        return;

    }


    /*
    Игрок уже выбыл
    */

    if (!player.alive) {

        return;

    }


    /*
    Спрашиваем причину
    */

    const reason =
        prompt(

            `Причина выбытия игрока "${player.name}"?`,

            "Голосование"

        );


    /*
    Пользователь нажал Отмена
    */

    if (
        reason === null
    ) {

        return;

    }


    /*
    Меняем состояние игрока
    */

    player.alive =
        false;


    /*
    Сохраняем время
    */

    player.eliminatedAt =
        new Date()
            .toISOString();


    /*
    Сохраняем причину
    */

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


    /*
    Если игра закончилась
    */

    if (winner) {

        finishGame(
            winner
        );

        return;

    }


    /*
    Иначе продолжаем игру
    */

    renderGame();

}


/* ==================================================
   ПРОВЕРКА ПОБЕДИТЕЛЯ
================================================== */

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
    Живые мирные + остальные роли
    */

    const aliveNonMafia =
        alivePlayers.filter(
            player =>
                player.role !==
                "mafia"
        ).length;


    /*
    ==============================================
    ПОБЕДА МИРНЫХ
    ==============================================

    Если мафии больше нет.
    */

    if (
        aliveMafia === 0
    ) {

        return "civilians";

    }


    /*
    ==============================================
    ПОБЕДА МАФИИ
    ==============================================

    Если мафии столько же,
    сколько остальных игроков,
    или больше.
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


/* ==================================================
   ЗАВЕРШЕНИЕ ИГРЫ
================================================== */

function finishGame(winner) {

    /*
    Сохраняем победителя
    */

    game.winner =
        winner;


    /*
    Останавливаем игру
    */

    game.started =
        false;


    /*
    Записываем событие
    */

    addEvent(
        "Игра окончена."
    );


    /*
    ==============================================
    ПОБЕДИЛА МАФИЯ
    ==============================================
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
    ==============================================
    ПОБЕДИЛИ МИРНЫЕ
    ==============================================
    */

    else {

        $("winnerTitle")
            .textContent =
            "МИРНЫЕ ПОБЕДИЛИ";


        $("winnerSubtitle")
            .textContent =
            "Все игроки мафии были устранены.";

    }


    /*
    Показываем экран победы
    */

    showScreen(
        "screen-winner"
    );

}


/* ==================================================
   РЕЗУЛЬТАТЫ
================================================== */

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


/* ==================================================
   НОВАЯ ИГРА
================================================== */

function newGame() {

    game.players = [];

    game.events = [];

    game.winner = null;

    game.started = false;

    game.mafiaCount = 0;


    /*
    Возвращаемся
    на главный экран
    */

    showScreen(
        "screen-start"
    );

}


/* ==================================================
   КНОПКА "ДАЛЕЕ"
================================================== */

$("btnCreatePlayers")
    .addEventListener(
        "click",
        createPlayers
    );


/* ==================================================
   КНОПКА "ДАЛЕЕ" ПОСЛЕ ИМЁН
================================================== */

$("btnToRoles")
    .addEventListener(
        "click",
        goToRoles
    );


/* ==================================================
   КНОПКА "НАЧАТЬ ИГРУ"
================================================== */

$("btnStartGame")
    .addEventListener(
        "click",
        startGame
    );


/* ==================================================
   КНОПКА "РЕЗУЛЬТАТЫ"
================================================== */

$("btnResults")
    .addEventListener(
        "click",
        showResults
    );


/* ==================================================
   НОВАЯ ИГРА
================================================== */

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


/* ==================================================
   ЗАВЕРШИТЬ ИГРУ
================================================== */

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


/* ==================================================
   КНОПКИ НАЗАД
================================================== */

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


/* ==================================================
   TELEGRAM BACK BUTTON
================================================== */

if (tg) {

    tg.BackButton.onClick(
        () => {

            const activeScreen =
                document.querySelector(
                    ".screen.active"
                );


            /*
            Экран имён
            */

            if (
                activeScreen.id ===
                "screen-names"
            ) {

                showScreen(
                    "screen-start"
                );

                tg.BackButton.hide();

                return;

            }


            /*
            Экран ролей
            */

            if (
                activeScreen.id ===
                "screen-roles"
            ) {

                showScreen(
                    "screen-names"
                );

                return;

            }


            /*
            На экране игры
            ничего автоматически
            не делаем
            */

            if (
                activeScreen.id ===
                "screen-game"
            ) {

                return;

            }


            /*
            Остальные экраны
            */

            showScreen(
                "screen-start"
            );

        }
    );

}


/* ==================================================
   ЗАПУСК
================================================== */

console.log(
    "MAFIA ROOM запущен"
);
