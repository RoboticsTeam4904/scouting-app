#[macro_use]
extern crate diesel;

mod client_coms;
mod models;
mod schema;

use client_coms::*;
use diesel::{pg::PgConnection, prelude::*};
use models::*;
use ring::digest::{digest, SHA256};
use std::sync::{Arc, Mutex};
use ws::{listen, Message::Text};

static GAME: &'static str = include_str!("game.json");
const POSTGRES_CON: &'static str = "host=localhost port=5432 dbname=scoutingdb";

struct State {
    assigned_teams: [Option<String>; 6],
}

fn main() {
    let hash = digest(&SHA256, GAME.as_bytes());

    listen("0.0.0.0:8000", |out| {
        let _ = out.send(hash.as_ref());
        let db = PgConnection::establish(POSTGRES_CON).unwrap();
        let client_user = "TODO, WAITING FOR OATH FROM IZZY ._.".to_owned();
        let state = Arc::new(Mutex::new(State {
            assigned_teams: <[Option<String>; 6]>::default(),
        }));

        move |msg| {
            let state = state.clone();
            let response = (|| -> Response {
                match msg {
                    Text(data) => match serde_json::from_str::<Request>(data.as_str()) {
                        Ok(request) => match request {
                            Request::GameSchema => Ok(GAME.to_owned()),
                            Request::Competitions => {
                                use schema::competitions::dsl::*;
                                let comps: Vec<Competition> = competitions
                                    .load(&db)
                                    .map_err(|e| ResponseError::DataBase(e.to_string()))?;
                                Ok(serde_json::to_string(&comps).unwrap())
                            }
                            Request::AssignedTeam => {
                                let state = state.lock().unwrap();
                                let mut assigned_team = None;
                                for (team, assignee) in state.assigned_teams.iter().enumerate() {
                                    if assignee == &Some(client_user.clone()) {
                                        return Ok(team.to_string());
                                    }
                                    if assignee.is_none() {
                                        assigned_team = Some(team);
                                    }
                                }
                                Ok(serde_json::to_string(&assigned_team).unwrap())
                            }
                            Request::AssignTeam { scouter, team } => {
                                if team < 6 {
                                    let mut state = state.lock().unwrap();
                                    state.assigned_teams[team] = Some(scouter.clone());
                                    Ok(scouter.to_string())
                                } else {
                                    Err(ResponseError::InvalidSyntax)
                                }
                            }
                            Request::AllAssignedTeams => {
                                let state = state.lock().unwrap();
                                Ok(serde_json::to_string(&state.assigned_teams).unwrap())
                            }
                            Request::Games(comp_id) => {
                                use schema::games::dsl::*;
                                let comp_games = games
                                    .filter(competition_id.eq(comp_id))
                                    .load::<Game>(&db)
                                    .map_err(|e| ResponseError::DataBase(e.to_string()))?;
                                Ok(serde_json::to_string(&comp_games).unwrap())
                            }
                            Request::Event(event) => {
                                use schema::events::dsl::*;
                                use schema::performances::dsl::{self as perf, *};
                                let new_event: Event = diesel::insert_into(events)
                                    .values(event)
                                    .get_result(&db)
                                    .map_err(|e| ResponseError::DataBase(e.to_string()))?;
                                let parent_performance =
                                    performances.filter(perf::id.eq(new_event.performance_id));
                                let mut parent_events: Vec<i32> = parent_performance
                                    .select(perf::event_ids)
                                    .first(&db)
                                    .map_err(|e| ResponseError::DataBase(e.to_string()))?;
                                parent_events.push(new_event.id);
                                diesel::update(parent_performance)
                                    .set(perf::event_ids.eq(parent_events))
                                    .execute(&db)
                                    .map_err(|e| ResponseError::DataBase(e.to_string()))?;
                                Ok(new_event.id.to_string())
                            }
                            Request::UndoEvent(event_id) => {
                                use schema::events::dsl::{self as ev, *};
                                use schema::performances::dsl::{self as perf, *};
                                let removed_event: Event =
                                    diesel::delete(events.filter(ev::id.eq(event_id)))
                                        .get_result(&db)
                                        .map_err(|e| ResponseError::DataBase(e.to_string()))?;
                                let parent_performance =
                                    performances.filter(perf::id.eq(removed_event.performance_id));
                                let mut parent_events: Vec<i32> = parent_performance
                                    .select(perf::event_ids)
                                    .first(&db)
                                    .map_err(|e| ResponseError::DataBase(e.to_string()))?;
                                parent_events
                                    .remove(parent_events.binary_search(&event_id).unwrap());
                                diesel::update(parent_performance)
                                    .set(perf::event_ids.eq(parent_events))
                                    .execute(&db)
                                    .map_err(|e| ResponseError::DataBase(e.to_string()))?;
                                Ok(event_id.to_string())
                            }
                        },
                        _ => Err(ResponseError::InvalidSyntax),
                    },
                    _ => Err(ResponseError::InvalidSyntax)
                }
            })();
            out.send(serde_json::to_string(&response).unwrap())?;
            Ok(())
        }
    })
    .expect("failure occurred");
}
