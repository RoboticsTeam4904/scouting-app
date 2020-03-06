table! {
    competitions (id) {
        id -> Int4,
        name -> VarChar
        game_ids -> Int4[]
    }
}

table! {
    games (id) {
        id -> Int4,
        num -> Int4,
        red_team_nums -> Int4[3],
        blue_team_nums -> Int4[3],
        red_performance_ids -> Int4[3],
        blue_performance_ids -> Int4[3],
    }
}

table! {
    performances (id) {
        id -> Int4,
        team_num -> Int4,
        event_ids -> Int4[],
    }
}

table! {
    events (id) {
        id -> Int4,
        game_id -> Int4,
        team_num -> Int4,
        timestamp -> Int4,
        name -> VarChar,
    }
}

table! {
    teams (id) {
        num -> Int4,
        performance_ids -> Int4[],
    }
}
