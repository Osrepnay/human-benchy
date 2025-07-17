#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Point3d {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Point2d {
    pub x: f32,
    pub y: f32,
}

#[derive(Clone, Debug)]
pub struct Triangle {
    pub pts: [Point3d; 3],
}
