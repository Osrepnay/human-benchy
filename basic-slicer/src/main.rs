use std::error::Error;

use basic_slicer::{parse::stl, slice::slice};

fn main() -> Result<(), Box<dyn Error>> {
    let file = std::fs::read("3DBenchy.stl")?;
    let triangles = stl(&file).expect("couldn't parse").1;
    let layers = slice(&triangles, 50);
    for segment in &layers[0].segments {
        println!("[");
        for point in segment {
            println!("  [{}, {}],", point.x, point.y);
        }
        println!("],");
    }

    Ok(())
}
