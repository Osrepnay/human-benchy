#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Point3d {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Point2d {
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Debug)]
pub struct Triangle {
    pub pts: [Point3d; 3],
}
