use serde::{Deserialize, Serialize};
use ws::{listen, Message::Text};

static GAME: &'static str = include_str!("game.json");

fn main() {
    listen("0.0.0.0:8000", |out| {
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
