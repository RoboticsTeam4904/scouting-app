import { v4 as uuidv4 } from 'uuid';

const serverURI = 'ws://127.0.0.1:8000';

interface IAction {
    name: string;
    label: string;
    accent: boolean;
    enabled: boolean;
    effects: Effect[];
}

interface IEvent {
    timestamp: number;
    stage: Stage;
    name: string;
}

interface IGame {
    id: number;
    competition_id: number;
    num: number;
    red_team_nums: number[];
    blue_team_nums: number[];
    performance_ids: number[];
}

type Action = string;
type Stage = string;

interface ITransition {
    kind: 'transition';
    stage: Stage;
}

interface IEnable {
    kind: 'enable';
    actions: Action[];
}

interface IDisable {
    kind: 'disable';
    actions: Action[];
}

interface INoCallbacks {
    kind: 'nocallbacks';
}

interface IEnd {
    kind: 'end';
}

type Effect = ITransition | IEnable | IDisable | IEnd | INoCallbacks;

interface IStage {
    name: Stage;
    label: string;
    timers: [number, Effect[]][];
    actions: IAction[];
}

interface ISchema {
    stages: IStage[];
    initial: string;
}

interface ICompetition {
    id: number,
    name: string,
    game_ids: number[],
}

class StageUI {
    private start: number;
    private time: Element;
    private element: Element;
    private intervals: ReturnType<typeof setInterval>[];
    private timerIdx: number;

    constructor(stage: IStage, cb: (a0: IAction) => void, tcb: (effects: Effect[]) => void) {
        this.time = document.querySelector('.timer')!;
        if (localStorage.getItem('start') && localStorage.getItem('active')! === stage.name) {
            this.start = parseInt(localStorage.getItem('start')!, 10);
        } else {
            this.start = Date.now();
            localStorage.setItem('start', Math.round(this.start).toString());
        }
        this.time.classList.add('active');
        this.intervals = [];
        const el = document.createElement('div');
        this.element = el;
        el.classList.add('stage');
        el.innerHTML = `<div class="title">${stage.label}</div>`;
        const actions = document.createElement('div');
        actions.classList.add('actions');
        for (const action of stage.actions) {
            const item = document.createElement('div');
            item.id = action.name;
            item.addEventListener('click', () => { cb(action); });
            item.classList.add('action');
            item.textContent = action.label;
            if (action.accent) {
                item.classList.add('accent');
            }
            if (!action.enabled) {
                item.classList.add('disabled');
            }
            actions.appendChild(item);
        }
        el.appendChild(actions);
        document.body.appendChild(el);
        const sortedTimers = stage.timers.sort((timer1, timer2) => {
            if (timer1[0] < timer2[0]) { return -1; } else if (timer1[0] > timer2[0]) { return 1; } else {
                return 0;
            }
        });
        this.timerIdx = 0;
        let leastTimer;
        if (sortedTimers.length === 0) {
            leastTimer = Infinity;

        } else {
            leastTimer = sortedTimers[this.timerIdx][0];
        }
        if (leastTimer < 60000) {
            const updateTime = (ti: number) => {
                const millis = Math.round((ti % 1000) / 10).toString().padStart(2, '0');
                const secs = Math.floor(ti / 1000).toString().padStart(2, '0');
                this.time.textContent = `${secs}:${millis}`;
            };
            this.intervals.push(setInterval(() => {
                const t = Date.now() - this.start;
                updateTime(t);
                if (sortedTimers[this.timerIdx] && t >= sortedTimers[this.timerIdx][0]) {
                    tcb(sortedTimers[this.timerIdx][1]); this.timerIdx += 1;
                }
            }, 10));
            const time = Date.now() - this.start;
            updateTime(time);
        } else {
            const updateTime = (ti: number) => {
                const secs = Math.round(ti % 60).toString().padStart(2, '0');
                const mins = Math.floor(ti / 60).toString().padStart(2, '0');
                this.time.textContent = `${mins}:${secs}`;
            };
            this.intervals.push(setInterval(() => {
                const t = Math.floor((Date.now() - this.start) / 1000);
                updateTime(t);
                if (sortedTimers[this.timerIdx] && t >= sortedTimers[this.timerIdx][0]) {
                    tcb(sortedTimers[this.timerIdx][1]); this.timerIdx += 1;
                }
            }, 1000));
            const time = Math.floor((Date.now() - this.start) / 1000);
            updateTime(time);
        }
    }

    public remove() {
        this.element.remove();
        this.time.textContent = '00:00';
        this.time.classList.remove('active');
        for (const interval of this.intervals) {
            clearInterval(interval);
        }
    }
}

enum AppState {
    Uninitialized,
    ReadingSchema,
    ReadingCompetitions,
    ReadingGames,
    Ready,
    Failed,
}

export default class App {
    private initialized: AppState;
    private tempHash: ArrayBuffer;
    private schema: ISchema;
    private server: WebSocket;
    private competitions: ICompetition[];
    private games: IGame[];
    private selectedGame: IGame;
    private performance_id: number;
    private ui: StageUI;

    constructor() {
        this.server = new WebSocket(serverURI);
        this.server.binaryType = 'arraybuffer';
        this.initialized = AppState.Uninitialized;
        this.server.onerror = () => {
            if (this.initialized !== AppState.Ready) {
                const schemaData = localStorage.getItem('schema');
                if (!schemaData) {
                    const el = document.createElement('div');
                    document.body.appendChild(el);
                    el.outerHTML = `<div style="display: flex; padding: 30px; width: 100vw; height: 100vh; justify-content: center; align-items: center; font-size: 3em; font-weight: bold; flex-flow: column; line-height: 1;"><div>Connection failed<div style="font-size: 0.5em; font-weight: normal; opacity: 0.7; margin-top: 10px;">No schema available</div></div></div>`;
                    this.initialized = AppState.Failed;
                } else {
                    this.read_schema();
                }
            }
        };
        this.server.onmessage = (message) => {
            switch (this.initialized) {
                case AppState.Uninitialized: {
                    if (btoa(String.fromCharCode.apply(null, new Uint8Array(message.data))) !== localStorage.getItem('schema_hash')) {
                        this.initialized = AppState.ReadingSchema;
                        this.tempHash = message.data;
                        this.server.send('"GameSchema"');
                    } else {
                        this.initialized = AppState.ReadingCompetitions;
                        this.server.send('"Competitions"');
                        this.read_schema();
                    }
                    break;
                }
                case AppState.ReadingSchema: {
                    const newSchema = JSON.parse(message.data)["Ok"];
                    localStorage.removeItem('active');
                    localStorage.removeItem('start');
                    localStorage.setItem('schema', newSchema);
                    localStorage.setItem('schema_hash',
                        btoa(String.fromCharCode.apply(null, new Uint8Array(this.tempHash))));
                    this.initialized = AppState.ReadingCompetitions;
                    this.read_schema();
                    this.server.send('"Competitions"')
                    console.log("read schema");
                    break;
                }
                case AppState.ReadingCompetitions: {
                    const newCompetitions = JSON.parse(message.data)["Ok"];
                    console.log(newCompetitions);
                    localStorage.setItem('competitions', newCompetitions);
                    this.initialized = AppState.ReadingGames;
                    this.read_competitions();
                    break;
                }
                case AppState.ReadingGames: {
                    console.log("heybro");
                    const games = JSON.parse(message.data)["Ok"];
                    localStorage.setItem('games', games);
                    this.initialized = AppState.Ready;
                    this.read_games();
                    break;
                }
            }
        };
    }

    private read_schema() {
        const data = localStorage.getItem('schema')!;
        const schema: ISchema = JSON.parse(data);
        this.schema = schema;
        const splash = document.querySelector('.splash');
        splash ?.classList.add('loaded');
        setTimeout(() => {
            splash ?.remove();
        }, 1000);
        if (localStorage.getItem('active')) {
            this.begin_game();
            return;
        }
    }

    private read_competitions() {
        const data = localStorage.getItem('competitions')!;
        this.competitions = JSON.parse(data);
        console.log(this.competitions);
        this.competition_select();
    }

    private read_games() {
        const data = localStorage.getItem('games')!;
        this.games = JSON.parse(data);
        this.game_select();
    }

    private competition_select() {
        const sc = document.querySelector('.selectcompetition')!;
        sc.classList.add('active');
        for (const competition of this.competitions) {
            const selector = document.createElement('button');
            selector.className = '.competitionselect';
            selector.textContent = competition.name;
            selector.addEventListener('click', () => {
                sc.classList.remove('active');
                this.server.send(`{ "Games": ${competition.id} }`);
            });
            sc.appendChild(selector);
        }
    }

    private game_select() {
        const gs = document.querySelector('.selectgame')!;
        const gss = gs.querySelector('select')!;
        const nextstate = gs.querySelector('button')!;
        gs.classList.add('active');
        for (const game of this.games) {
            const selector = document.createElement('option');
            selector.text = game.num.toString();
            selector.className = '.gameselectoption';
            nextstate.addEventListener('click', () => {
                if (gss.value !== game.num.toString()) {
                    return;
                }
                gs.classList.remove('active');
                this.selectedGame = game;
                this.initialized = AppState.Ready
                this.robot_select();
            });
            gss.appendChild(selector);
        }
    }

    private robot_select() {
        // TODO: Add option to select which game it is
        const gs = document.querySelector('.gamestart')!;
        gs.classList.add('active');
        let i = 0;
        for (const redteam of this.selectedGame.red_team_nums) {
            ++i;
            const teamSelector = document.createElement('div');
            teamSelector.className = 'robot';
            const team = document.createElement('div');
            team.className = 'team';
            team.textContent = `Red ${i}`;
            const input = document.createElement('div');
            input.className = 'input';
            const start = document.createElement('div');
            start.className = 'start';
            teamSelector.appendChild(team);
            teamSelector.appendChild(input);
            teamSelector.appendChild(start);
        }
        i = 0
        for (const blueteam of this.selectedGame.blue_team_nums) {
            ++i;
            const teamSelector = document.createElement('div');
            teamSelector.className = 'robot';
            const team = document.createElement('div');
            team.className = 'team';
            team.textContent = `Blue ${i}`;
            const input = document.createElement('div');
            input.className = 'input';
            const start = document.createElement('div');
            start.className = 'start';
            teamSelector.appendChild(team);
            teamSelector.appendChild(input);
            teamSelector.appendChild(start);
        }
        document.querySelectorAll('.start').forEach((e) => {
            e.addEventListener('click', () => {
                gs.classList.remove('active');
                this.begin_game();
            })
        });
    }

    private begin_game() {
        let initial = this.schema.initial;
        const storedInitial = localStorage.getItem('active');
        if (storedInitial) {
            initial = storedInitial!;
        } else {
            localStorage.setItem('active', initial);
        }
        for (const stage of this.schema.stages) {
            if (stage.name === initial) {
                this.ui = new StageUI(stage,
                    (action) => { this.handle_action(action); },
                    (timer) => {
                        this.handle_timer(timer);
                    });
            }
        }
    }

    private transition(schema: string) {
        for (const stage of this.schema.stages) {
            if (stage.name === schema) {
                this.ui.remove();
                this.ui = new StageUI(stage,
                    (action) => { this.handle_action(action); },
                    (timer) => {
                        this.handle_timer(timer);
                    });
                break;
            }
        }
    }

    private handle_action(action: IAction) {
        if (action.effects.find((effect) => effect.kind === 'nocallbacks') !== undefined) {
            return;
        }
        this.process_effects(action.effects);
    }

    private process_effects(effects: Effect[]) {
        for (const effect of effects) {
            switch (effect.kind) {
                case 'transition': {
                    this.transition(effect.stage);
                    localStorage.setItem('active', effect.stage);
                    break;
                }
                case 'disable': {
                    for (const targetId of (effect as IDisable).actions) {
                        document.querySelector(`#${targetId}`) ?.classList.add('disabled');
                    }
                    break;
                }
                case 'enable': {
                    for (const targetId of (effect as IEnable).actions) {
                        document.querySelector(`#${targetId}`) ?.classList.remove('disabled');
                    }
                    break;
                }
                case 'end': {
                    this.ui.remove();
                    localStorage.removeItem('active');
                    localStorage.removeItem('start');
                    document.querySelector('.gameend') ?.classList.add('active');
                }
            }
        }
    }

    private handle_timer(effects: Effect[]) {
        this.process_effects(effects);
    }
}
