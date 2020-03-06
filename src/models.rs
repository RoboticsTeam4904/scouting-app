use serde::{Serialize, Deserialize};
use super::schema::*;

#[derive(Queryable, Serialize)]
pub struct Competition {
    pub id: i32,
    pub name: String,
    pub game_ids: Vec<i32>,
}

#[derive(Insertable)]
#[table_name = "competitions"]
pub struct NewCompetition {
    pub name: String,
    pub game_ids: Vec<i32>,
}

#[derive(Queryable, Serialize)]
pub struct Game {
    pub id: i32,
    pub competition_id: i32,
    pub num: i32,
    pub red_team_nums: Vec<i32>, // length 3
    pub blue_team_nums: Vec<i32>,
    pub performance_ids: Vec<i32>, // length 6
}

#[derive(Insertable)]
#[table_name = "games"]
pub struct NewGame {
    pub num: i32,
    pub red_team_nums: Vec<i32>, // These should always be length 3
    pub blue_team_nums:  Vec<i32>,
    pub performance_ids:  Vec<i32>, // this should be length 6
}

#[derive(Queryable)]
pub struct Performance {
    pub id: i32,
    pub game_id: i32,
    pub team_num: i32,
    pub event_ids: Vec<i32>,
}

#[derive(Insertable)]
#[table_name = "performances"]
pub struct NewPerformance {
    pub team_num: i32,
}

#[derive(Queryable)]
pub struct Event {
    pub id: i32,
    pub performance_id: i32,
    pub team_num: i32,
    pub timestamp: i32,
    pub name: String,
    pub scouter_name: String,
}

#[derive(Insertable, Deserialize)]
#[table_name = "events"]
pub struct NewEvent {
    pub performance_id: i32,
    pub team_num: i32,
    pub timestamp: i32,
    pub name: String,
    pub scouter_name: String,
}

#[derive(Queryable, Insertable)]
pub struct Team {
    pub num: i32,
    pub performance_ids: Vec<Performance>,
}
