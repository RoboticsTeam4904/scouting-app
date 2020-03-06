CREATE TABLE competitions (
    id Serial PRIMARY KEY,
    name VarChar NOT NULL,
    game_ids Int4[] NOT NULL
);

CREATE TABLE games (
    id Serial PRIMARY KEY,
    num Serial NOT NULL,
    red_team_nums Int4[3] NOT NULL,
    blue_team_nums Int4[3] NOT NULL,
    red_performance_ids Int4[3] NOT NULL,
    blue_performance_ids Int4[3]  NOT NULL
);

CREATE TABLE performances (
    id Serial PRIMARY KEY,
    team_num Int4 NOT NULL,
    event_ids Int4[] NOT NULL
);

CREATE TABLE events (
    id Serial PRIMARY KEY,
    game_id Int4 NOT NULL,
    team_num Int4 NOT NULL,
    timestamp Int4 NOT NULL,
    name VarChar NOT NULL
);

CREATE TABLE teams (
    id Int4 PRIMARY KEY NOT NULL,
    performance_ids Int4[] NOT NULL
);