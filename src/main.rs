#[macro_use]
extern crate diesel;

mod models;
mod schema;

use diesel::{pg::PgConnection, prelude::*};
use ring::digest::{digest, SHA256};
use serde::{Deserialize, Serialize};
use ws::{listen, Message::Text};

static GAME: &'static str = include_str!("game.json");
const POSTGRES_CON: &'static str =
    "host=localhost port=5432 dbname=scoutingdb user=postgres password=postgres";

fn main() {
    let connection = PgConnection::establish(POSTGRES_CON).unwrap();

    let hash = digest(&SHA256, GAME.as_bytes());

    listen("0.0.0.0:8000", |out| {
        let _ = out.send(hash.as_ref());

        move |msg| {
            match msg {
                Text(data) => match data.as_str() {
                    "g" => {
                        out.send(GAME)?;
                    }
                    _ => {}
                },
                _ => {}
            };
            Ok(())
        }
    })
    .expect("failure occurred");
}
