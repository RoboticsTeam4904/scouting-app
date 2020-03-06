#[derive(Queryable)]
pub struct Competition {
    pub id: i32,
    pub name: String,
    pub game_ids: Vec<i32>,
}

#[derive(Queryable)]
pub struct Game {
    pub id: i32,
    pub num: i32,
    pub red_team_nums: [i32; 3],
    pub blue_team_nums: [i32; 3],
    pub red_performance_ids: [i32; 3],
    pub blue_performance_ids: [i32; 3],
}

#[derive(Queryable)]
pub struct Performance {
    pub id: i32,
    pub team_num: i32,
    pub event_ids: Vec<i32>,
}

#[derive(Queryable)]
pub struct Event {
    pub id: i32,
    pub game_id: i32,
    pub team_num: i32,
    pub timestamp: i32,
    pub name: String,
}

#[derive(Queryable)]
pub struct Team {
    pub num: i32,
    pub performance_ids: Vec<Performance>,
}
