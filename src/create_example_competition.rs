#[macro_use]
extern crate diesel;

mod client_coms;
mod models;
mod schema;

use diesel::{pg::PgConnection, prelude::*};
use models::*;
use schema::competitions::dsl::{self as comps, *};
use schema::games::dsl::{self as gs, *};
use schema::performances::dsl::{self as perfs, *};
use schema::teams::dsl::{self as ts, *};
use std::sync::{Arc, Mutex};

const POSTGRES_CON: &'static str =
    "host=localhost port=5432 user=postgres password=postgres dbname=scoutingdb";

fn main() {
    let db = PgConnection::establish(POSTGRES_CON).unwrap();

    let new_competition = NewCompetition {
        name: "Example Competition".to_string(),
        game_ids: vec![],
    };
    let competition: Competition = diesel::insert_into(competitions)
        .values(new_competition)
        .get_result(&db)
        .unwrap();

    let new_game = NewGame {
        num: 1,
        competition_id: competition.id,
        red_team_nums: vec![4904, 4905, 4906],
        blue_team_nums: vec![4907, 4908, 4910],
        performance_ids: vec![],
    };
    let game: Game = diesel::insert_into(games)
        .values(new_game)
        .get_result(&db)
        .unwrap();
    diesel::update(competitions.filter(comps::id.eq(competition.id)))
        .set(comps::game_ids.eq(vec![game.id]))
        .execute(&db)
        .unwrap();

    let mut new_performances = vec![];
    for &team in game
        .red_team_nums
        .iter()
        .chain(game.blue_team_nums.iter())
    {
        let new_perf = NewPerformance {
            game_id: game.id,
            team_num: team,
        };
        let performance: Performance = diesel::insert_into(performances)
            .values(new_perf)
            .get_result(&db)
            .unwrap();
        new_performances.push(performance.id);
        diesel::insert_into(teams)
            .values(Team {
                num: team,
                performance_ids: vec![performance.id],
            })
            .execute(&db)
            .unwrap();
    }
    diesel::update(games.filter(gs::id.eq(game.id)))
        .set(gs::performance_ids.eq(new_performances))
        .execute(&db)
        .unwrap();
}
