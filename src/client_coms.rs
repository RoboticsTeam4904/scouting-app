use super::models::NewEvent;
use serde::{Serialize, Deserialize};

#[derive(Deserialize)]
pub enum Request {
    GameSchema,      // Ask for game schema
    Competitions,    // Ask for competition list
    AssignedTeam,    // Ask for client's assigned team, the team is in [0, 6)
    AssignTeam { scouter: String, team: usize }, // Assigns a scouter the given team
    AllAssignedTeams, // Ask for which teams are assigned to which scouters
    Games(i32),      // Ask for list of games in a certain competition
    Event(NewEvent), // Push an event to the db, responds with the event's id
    UndoEvent(i32), // Remove an event from the db based on its id
}

pub type Response = Result<String, ResponseError>;

#[derive(Serialize)]
pub enum ResponseError {
    DataBase(String), // A database query or execution failed
    Unauthorized, // User is not authorized to complete some option
    InvalidSyntax, // Could not parse request
}
