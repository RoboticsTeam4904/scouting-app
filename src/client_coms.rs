use super::models::NewEvent;
use serde::Deserialize;

#[derive(Deserialize)]
pub enum Request {
    GameSchema,      // Ask for game schema
    Competitions,    // Ask for competition list
    Games(i32),      // Ask for list of games in a certain competition
    Event(NewEvent), // Push an event to the db
}
