use nom::{
    IResult, Parser,
    bytes::complete::take,
    combinator::map,
    multi::count,
    number::{
        complete::{le_u16, le_u32},
        le_f32,
    },
    sequence::preceded,
};

use crate::types::Point3d;
use crate::types::Triangle;

fn header(input: &[u8]) -> IResult<&[u8], ()> {
    let (rest, _) = take(80usize)(input)?;
    Ok((rest, ()))
}

fn point(input: &[u8]) -> IResult<&[u8], Point3d> {
    map(count(le_f32(), 3), |num_vec| Point3d {
        x: num_vec[0] as f64,
        y: num_vec[1] as f64,
        z: num_vec[2] as f64,
    })
    .parse(input)
}

fn triangle(input: &[u8]) -> IResult<&[u8], Triangle> {
    let (input, triangle) = map(count(point, 4), |tri_vec| Triangle {
        pts: tri_vec[1..].try_into().unwrap(),
    })
    .parse(input)?;

    let (input, attribute_bytes) = le_u16(input)?;

    let (input, _) = take(attribute_bytes as usize)(input)?;

    Ok((input, triangle))
}

pub fn stl(input: &[u8]) -> IResult<&[u8], Vec<Triangle>> {
    let (input, num) = preceded(header, le_u32).parse(input)?;
    count(triangle, num as usize).parse(input)
}
