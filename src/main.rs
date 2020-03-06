#[macro_use]
extern crate diesel;

mod client_coms;
mod models;
mod schema;

use client_coms::*;
use diesel::{pg::PgConnection, prelude::*};
use models::*;
use ring::digest::{digest, SHA256};
use ws::{listen, Message::Text};

static GAME: &'static str = include_str!("game.json");
const POSTGRES_CON: &'static str = "host=localhost port=5432 dbname=scoutingdb";

fn main() {
    let hash = digest(&SHA256, GAME.as_bytes());

    listen("0.0.0.0:8000", |out| {
        let _ = out.send(hash.as_ref());
        let db = PgConnection::establish(POSTGRES_CON).unwrap();

        move |msg| {
            match msg {
                Text(data) => match serde_json::from_str::<Request>(data.as_str()) {
                    Ok(request) => match request {
                        Request::GameSchema => {
                            out.send(GAME)?;
                        }
                        Request::Competitions => {
                            use schema::competitions::dsl::*;
                            let comps: Vec<Competition> = competitions
                                .load(&db)
                                .expect("Could not retrieve competitions from db");
                            out.send(serde_json::to_string(&comps).unwrap())?;
                        }
                        Request::Games(comp_id) => {
                            use schema::games::dsl::*;
                            let comp_games = games
                                .filter(competition_id.eq(comp_id))
                                .load::<Game>(&db)
                                .expect("Could not retrieve games from db");
                            out.send(serde_json::to_string(&comp_games).unwrap())?;
                        }
                        Request::Event(event) => {
                            use schema::events::dsl::*;
                            use schema::performances::dsl::{self as perf, *};
                            let new_event: Event = diesel::insert_into(events)
                                .values(event)
                                .get_result(&db)
                                .expect("Could not add event to db");
                            let parent_performance =
                                performances.filter(perf::id.eq(new_event.performance_id));
                            let parent_events: Vec<i32> = parent_performance
                                .select(perf::event_ids)
                                .first(&db)
                                .unwrap();
                            diesel::update(parent_performance)
                                .set(perf::event_ids.eq(parent_events))
                                .execute(&db)
                                .unwrap();
                        }
                    },
                    Err(_) => (),
                },
                _ => {}
            };
            Ok(())
        }
    })
    .expect("failure occurred");
}
