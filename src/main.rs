use ring::digest::{digest, SHA256};
use serde::{Deserialize, Serialize};
use ws::{listen, Message::Text};

static GAME: &'static str = include_str!("game.json");

fn main() {
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
