module make_dome(base=1000, factor=0.4) {
    radius = sqrt(pow(base,2)/(2*(1-factor)-pow(1-factor,2)));
    translate([0,0,-radius*factor])
    difference() {
        sphere(r=radius);
        translate([0,0,-radius*(1-factor)])
        cube(radius*2, center=true);
    }
}

outside_r = 1000;
factor = 0.6;

color([0.4,0.4,0.4], 1);
cylinder(h=100, r=outside_r);
translate([0,0,100]) make_dome(outside_r*0.96, factor);
color([0.7,0.7,1], 0.6);
translate([0,0,100]) make_dome(outside_r, factor);