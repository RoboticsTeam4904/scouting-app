use serde::Deserialize;
use super::models::NewEvent;

#[derive(Deserialize)]
pub enum Request {
    GameSchema, // Ask for game schema
    Competitions, // Ask for competition list
    Games(i32), // Ask for list of games in a certain competition
    Event(NewEvent),
}
