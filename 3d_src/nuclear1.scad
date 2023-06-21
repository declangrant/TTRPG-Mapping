color([0.3,0.3,0.3]);
scale = 20;
rotate_extrude(convexity = 10)
translate([3*scale,0,0])
polygon([[0,0],[1.1*scale,0],[0.5*scale,3*scale],[0.3*scale,7*scale],[0.5*scale,10*scale],[0,10*scale]]);
cylinder(h=2*scale, r=3*scale);