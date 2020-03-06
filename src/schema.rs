table! {
    competitions (id) {
        id -> Int4,
        name -> VarChar,
        game_ids -> Array<Int4>,
    }
}

table! {
    games (id) {
        id -> Int4,
        num -> Int4,
        red_team_nums -> Array<Int4>, // these should be length 3, idk
        blue_team_nums -> Array<Int4>,
        performance_ids -> Array<Int4>, // this should be length 6
    }
}

table! {
    performances (id) {
        id -> Int4,
        game_id -> Int4,
        team_num -> Int4,
        event_ids -> Array<Int4>,
    }
}

table! {
    events (id) {
        id -> Int4,
        performance_id -> Int4,
        team_num -> Int4,
        timestamp -> Int4,
        name -> VarChar,
        scouter_name -> VarChar,
    }
}

table! {
    teams (num) {
        num -> Int4,
        performance_ids -> Array<Int4>,
    }
}
