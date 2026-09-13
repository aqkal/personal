"""Distinctive low-poly learning studios and the Advanced Engineering pavilion."""

from __future__ import annotations

import math

import project_gallery

BUCKLER_X = 25
BUCKLER_Z = -37


def studio_materials(env):
    """Six reusable material batches, with sRGB brand colors stored as linear."""
    for name, color in {
        "StudioForest": "143f2c", "StudioLavender": "cdbcec",
        "ConstructionYellow": "f5bc41", "StudioCyan": "56bfc2",
        "StudioWhite": "f3f1e9", "StudioInk": "171b19",
    }.items():
        rgb = [int(color[i:i+2], 16) / 255 for i in (0, 2, 4)]
        env.COLORS[name] = tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb) + (1,)
        if name not in env.MATS:
            env.MATS[name] = env.material(name)


def worker(env, coll, x, y, z, pose="standing", heading=0, vest="ConstructionYellow"):
    """A posed, batched miniature crew member; y is the boot sole elevation."""
    prefix = "StudioQualiaWorker"
    def point(dx, dy, dz):
        return (x + math.cos(heading)*dx + math.sin(heading)*dz,
                y + dy, z - math.sin(heading)*dx + math.cos(heading)*dz)
    def block(part, pos, size, mat, bevel=.02):
        return env.box(prefix+part, point(*pos), size, mat, coll, rot=heading, bevel=bevel)
    def limb(part, start, end, radius, mat):
        env.cable_between(prefix+part, point(*start), point(*end), radius, mat, coll)
    seated = pose == "operator"
    hip = .46 if seated else .88
    chest = hip + .30
    block("Vest", (0, chest, 0), (.43, .55, .29), vest, .035)
    block("ReflectiveBelt", (0, chest-.08, .155), (.44, .065, .018), "StudioWhite")
    for side in (-1, 1):
        block("ReflectiveTape", (side*.12, chest+.12, .156), (.052, .28, .018), "StudioWhite")
        knee = (side*.13, .43, .27 if seated else .03)
        foot = (side*.13, .10, .35 if seated else .04)
        limb("Thigh", (side*.13, hip, 0), knee, .105, "StudioInk")
        limb("Shin", knee, foot, .085, "StudioInk")
        block("Boot", (side*.13, .08, foot[2]+.07), (.19, .16, .30), "Dark")
        shoulder = (side*.25, chest+.16, 0)
        if seated:
            elbow, hand = (side*.31, chest-.05, .17), (side*.27, chest, .36)
        elif pose == "signal" and side == 1:
            elbow, hand = (.43, chest+.46, .02), (.41, chest+.74, .02)
        elif pose == "builder":
            elbow, hand = (side*.32, chest+.03, .24), (side*.18, chest+.10, .45)
        else:
            elbow, hand = (side*.30, chest-.09, .02), (side*.30, chest-.32, .06)
        limb("Sleeve", shoulder, elbow, .085, vest)
        limb("Forearm", elbow, hand, .062, "SandstoneCream")
        env.sphere(prefix+"Glove", point(*hand), (.075, .075, .075), "StudioWhite", coll)
    head = chest + .48
    env.sphere(prefix+"Head", point(0, head, .015), (.19, .23, .18), "SandstoneCream", coll)
    env.sphere(prefix+"HardHat", point(0, head+.17, 0), (.225, .16, .215), "ConstructionYellow", coll)
    env.cyl(prefix+"HatBrim", point(0, head+.11, .02), .24, .045, "ConstructionYellow", coll, vertices=10, bevel=0)
    block("Eyes", (0, head+.01, .185), (.13, .038, .025), "StudioInk")
    if pose == "builder":
        limb("ToolHandle", (.18, chest+.10, .45), (.18, chest+.38, .45), .026, "Bronze")
        block("HammerHead", (.18, chest+.39, .45), (.23, .09, .09), "Metal")


def qualia(env, coll):
    """An active construction diorama within the original public studio site."""
    box, cyl, beam = env.box, env.cyl, env.cable_between
    box("StudioQualiaPlinth", (18,.28,-25), (10,.56,10), "Concrete", coll, bevel=.14)
    box("StudioQualiaBody", (18,2.65,-25.65), (9.2,4.75,7.7), "StudioForest", coll, bevel=.12)
    box("StudioQualiaGlass", (18,2.6,-21.77), (7.4,2.75,.14), "StudioCyan", coll, bevel=.02)
    box("StudioQualiaDoor", (18,1.55,-21.66), (2.3,2.55,.14), "RiverBlue", coll, bevel=.02)
    for px in (13.9,15.95,20.05,22.1):
        cyl("StudioQualiaVerandaPost", (px,2.5,-20.75), .13,4.4,"StudioForest",coll,vertices=8)
    box("StudioQualiaVeranda", (18,4.72,-21.35), (9.8,.22,2.5), "StudioForest",coll,bevel=.055)
    box("StudioQualiaLavenderFascia", (18,4.68,-20.08), (9.8,.16,.07), "StudioLavender",coll,bevel=0)
    # The root's readable Qualia atlas sits above this uninterrupted sign band.
    box("StudioQualiaBrandBand", (18,3.95,-21.57), (7.6,.65,.11), "StudioForest",coll,bevel=.01)
    for px in (14.65,16.75,19.25,21.35):
        box("StudioQualiaFrontMullion",(px,2.4,-21.63),(.07,2.7,.12),"StudioWhite",coll,bevel=0)
    box("StudioQualiaUpperSlab", (18,5.05,-25.5),(9.4,.24,7.9),"Concrete",coll,bevel=.04)
    for px in (14,18,22):
        for pz in (-28.8,-22.2):
            box("StudioQualiaUpperFrame",(px,6.55,pz),(.20,2.8,.20),"StudioForest",coll,bevel=.01)
            for dx in (-.065,.065):
                cyl("StudioQualiaRebar",(px+dx,8.32,pz),.018,.66,"Metal",coll,vertices=5,bevel=0)
        box("StudioQualiaRoofBeam",(px,7.95,-25.5),(.22,.24,6.9),"StudioForest",coll,bevel=.01)
    for pz in (-28.8,-22.2):
        box("StudioQualiaHeader",(18,7.95,pz),(8.3,.24,.2),"StudioForest",coll,bevel=.01)
    box("StudioQualiaPartialWall",(14,6.1,-26.3),(.18,1.9,3.5),"StudioLavender",coll,bevel=.02)
    for px in (15.1,17.05):
        box("StudioQualiaUpperGlazing",(px,6.5,-28.72),(1.78,2.45,.09),"StudioCyan",coll,bevel=.01)
    # A working scaffold with boards, toe rails, end rails and crossed braces.
    for pz in (-28.7,-25.7,-22.7):
        for px in (13.35,14.15):
            cyl("StudioQualiaScaffoldUpright",(px,3.8,pz),.045,7.5,"Metal",coll,vertices=6,bevel=0)
        for y in (2.5,5,7.2):
            box("StudioQualiaScaffoldDeck",(13.75,y,pz),(.95,.10,2.9),"Bronze",coll,bevel=0)
            for rail_y in (y+.15,y+.68,y+1.05):
                beam("StudioQualiaScaffoldGuard",(13.31,rail_y,pz-1.44),(13.31,rail_y,pz+1.44),.027,"StudioWhite",coll)
        beam("StudioQualiaScaffoldBrace",(13.32,.6,pz-1.4),(13.32,4.9,pz+1.4),.03,"Metal",coll)
        beam("StudioQualiaScaffoldBrace",(13.32,4.9,pz-1.4),(13.32,.6,pz+1.4),.03,"Metal",coll)
    for px in (13.46,14.01):
        beam("StudioQualiaLadder",(px,.55,-21.2),(px,5.12,-22.1),.035,"ConstructionYellow",coll)
    for i in range(12):
        t=i/11
        beam("StudioQualiaLadderRung",(13.46,.55+4.57*t,-21.2-.9*t),(14.01,.55+4.57*t,-21.2-.9*t),.028,"ConstructionYellow",coll)
    # Four-leg tower crane; the jib never reaches the neighbouring studio.
    cx, cz = 21.8,-28.45
    box("StudioQualiaCraneFoot",(cx,.55,cz),(1.75,1.1,1.75),"Concrete",coll,bevel=.06)
    for dx in (-.4,.4):
        for dz in (-.4,.4):
            cyl("StudioQualiaCraneMast",(cx+dx,5.65,cz+dz),.065,10.2,"ConstructionYellow",coll,vertices=6,bevel=0)
    for i in range(8):
        y0=.8+i*1.2; y1=y0+1.2
        for side in (-.4,.4):
            beam("StudioQualiaCraneBrace",(cx-.4,y0,cz+side),(cx+.4,y1,cz+side),.035,"ConstructionYellow",coll)
            beam("StudioQualiaCraneBrace",(cx+side,y0,cz-.4),(cx+side,y1,cz+.4),.035,"ConstructionYellow",coll)
            beam("StudioQualiaCraneTie",(cx-.4,y1,cz+side),(cx+.4,y1,cz+side),.04,"ConstructionYellow",coll)
    cyl("StudioQualiaSlewRing",(cx,10.76,cz),.69,.28,"Metal",coll,vertices=12,bevel=.02)
    for pz in (cz-.36,cz+.36):
        beam("StudioQualiaJibChord",(13.9,10.85,pz),(23,10.85,pz),.075,"ConstructionYellow",coll)
        beam("StudioQualiaJibChord",(13.9,11.52,pz),(23,11.52,pz),.06,"ConstructionYellow",coll)
        for i in range(10):
            px=13.9+i*.9
            beam("StudioQualiaJibLattice",(px,10.85,pz),(px+.9,11.52,pz),.033,"ConstructionYellow",coll)
            beam("StudioQualiaJibLattice",(px,11.52,pz),(px+.9,10.85,pz),.033,"ConstructionYellow",coll)
    for px in (14.1,16.4,18.7,21,22.8):
        beam("StudioQualiaJibCrossTie",(px,10.85,cz-.36),(px,10.85,cz+.36),.04,"ConstructionYellow",coll)
    for dx in (-.48,.48):
        beam("StudioQualiaCraneAFrame",(cx+dx,11,cz),(cx,13.0,cz),.07,"ConstructionYellow",coll)
    for px in (14.1,22.9):
        for dz in (-.3,.3):
            beam("StudioQualiaCraneStay",(cx,12.9,cz),(px,11.52,cz+dz),.024,"Metal",coll)
    for px in (22.55,22.88):
        box("StudioQualiaCounterweight",(px,10.47,cz),(.3,.7,1.15),"Concrete",coll,bevel=.03)
    box("StudioQualiaWinch",(22.55,11.15,cz),(.55,.4,.46),"StudioInk",coll,bevel=.04)
    # Open cab front: cyan side/rear glazing frames a clearly visible operator.
    cabx,cabz=20.66,-27.63
    box("StudioQualiaCabFloor",(cabx,9.75,cabz),(1.3,.16,1.26),"ConstructionYellow",coll,bevel=.03)
    box("StudioQualiaCabRoof",(cabx,11.35,cabz),(1.4,.14,1.35),"ConstructionYellow",coll,bevel=.035)
    box("StudioQualiaCabRear",(cabx,10.55,cabz-.56),(1.12,1.35,.06),"StudioCyan",coll,bevel=.01)
    box("StudioQualiaCabSideGlass",(cabx+.6,10.55,cabz),(.05,1.32,1.07),"StudioCyan",coll,bevel=.01)
    for dx in (-.6,.6):
        for dz in (-.56,.56):
            box("StudioQualiaCabPillar",(cabx+dx,10.55,cabz+dz),(.055,1.52,.055),"ConstructionYellow",coll,bevel=0)
    box("StudioQualiaCabSeat",(cabx,10.24,cabz-.19),(.50,.13,.48),"StudioInk",coll,bevel=.03)
    box("StudioQualiaCabSeatBack",(cabx,10.5,cabz-.39),(.50,.55,.10),"StudioInk",coll,bevel=.03)
    box("StudioQualiaCabControls",(cabx,10.42,cabz+.39),(.94,.16,.22),"StudioInk",coll,bevel=.02)
    worker(env,coll,cabx,9.86,cabz-.07,"operator",vest="StudioLavender")
    # A suspended bundle and sling read as a live lift without animation cost.
    hx=16.5
    box("StudioQualiaTrolley",(hx,10.81,cz),(.65,.26,.95),"StudioInk",coll,bevel=.03)
    for dz in (-.12,.12):
        beam("StudioQualiaHoistCable",(hx,10.7,cz+dz),(hx,8.9,cz+dz),.018,"Metal",coll)
    box("StudioQualiaHookBlock",(hx,8.88,cz),(.29,.36,.26),"ConstructionYellow",coll,bevel=.04)
    for dx in (-.6,.6):
        beam("StudioQualiaLoadSling",(hx,8.66,cz),(hx+dx,8.28,cz),.023,"Metal",coll)
    for dz in (-.18,0,.18):
        box("StudioQualiaLiftedSteel",(hx,8.20,cz+dz),(2.15,.12,.12),"StudioForest",coll,bevel=.01)
    worker(env,coll,19.0,5.19,-22.75,"signal")
    worker(env,coll,15.0,5.19,-25.0,"builder",heading=-math.pi/2)
    worker(env,coll,13.75,5.08,-23.25,"builder",heading=math.pi/2,vest="StudioLavender")
    worker(env,coll,21.5,.57,-20.9,"standing",heading=-.3)
    for row in range(3):
        box("StudioQualiaMaterialStack",(21.65,.65+row*.16,-21.8),(1.6,.12,.6),"StudioLavender",coll,bevel=.01)
    for px in (14.8,21.9):
        box("StudioQualiaBarrier",(px,1.02,-20.18),(1.65,.68,.14),"StudioForest",coll,bevel=.02)
        for dx in (-.55,0,.55):
            box("StudioQualiaHazardStripe",(px+dx,1.02,-20.095),(.20,.52,.018),"ConstructionYellow",coll,bevel=0)
    for pz in (-28.5,-25.5):
        for y in (.65,1.2):
            box("StudioQualiaSiteFenceRail",(22.9,y,pz),(.07,.08,2.8),"Metal",coll,bevel=0)
        for dz in (-1.35,0,1.35):
            cyl("StudioQualiaSiteFencePost",(22.9,.7,pz+dz),.035,1.4,"Metal",coll,vertices=6,bevel=0)


def dsr(env, coll):
    """Monochrome editorial atelier inspired by dsrb.com.au, not a replica."""
    box, cyl = env.box, env.cyl
    box("StudioDSRPlinth",(31,.26,-23),(9,.52,9),"Concrete",coll,bevel=.12)
    box("StudioDSRBody",(31,2.8,-23.35),(8.35,5.1,7.8),"StudioWhite",coll,bevel=.06)
    box("StudioDSRFrontGlass",(31,2.65,-19.38),(7.7,3.2,.12),"RiverBlue",coll,bevel=.01)
    # Tall perimeter portal frames the project displays, never the door centre.
    for px in (26.95,35.05):
        box("StudioDSRPortalPier",(px,2.85,-19.16),(.22,5.20,.54),"StudioInk",coll,bevel=.01)
    box("StudioDSRSignBacking",(31,4.55,-19.10),(7.9,1.3,.20),"StudioInk",coll,bevel=.01)
    box("StudioDSRDoor",(31,1.75,-19.16),(1.65,2.9,.10),"StudioCyan",coll,bevel=.01)
    for px in (30.13,31.87):
        box("StudioDSRDoorJamb",(px,1.76,-19.08),(.085,2.95,.18),"StudioInk",coll,bevel=0)
    box("StudioDSRDoorHead",(31,3.25,-19.08),(1.82,.10,.18),"StudioInk",coll,bevel=0)
    box("StudioDSRDoorHandle",(31.55,1.6,-19.04),(.04,.52,.04),"StudioInk",coll,bevel=0)
    # Printed folio sheets are inset within deep black physical display cases.
    for px in (28.45,33.55):
        box("StudioDSRFolioFrame",(px,2.65,-19.14),(2.25,2.85,.28),"StudioInk",coll,bevel=.025)
        box("StudioDSRFolioBacking",(px,2.65,-19.00),(2.05,2.65,.04),"StudioWhite",coll,bevel=0)
        box("StudioDSRFolioLedge",(px,1.17,-18.98),(2.32,.09,.40),"StudioInk",coll,bevel=.01)
    box("StudioDSRSideFolioFrame",(35.10,2.65,-23.1),(.28,2.85,2.7),"StudioInk",coll,bevel=.025)
    box("StudioDSRSideFolioBacking",(35.24,2.65,-23.1),(.04,2.65,2.5),"StudioWhite",coll,bevel=0)
    for bay in (-2.75,0,2.75):
        roof=box("StudioDSRSawRoof",(31+bay,5.65,-23.2),(2.9,.22,8.2),"StudioInk",coll,bevel=.04)
        # Game x slope is a rotation around Blender Y, as in the original roof.
        roof.rotation_euler[1]=-.16
        box("StudioDSRRoofLight",(31+bay-1.25,5.35,-23.2),(.16,.75,7.5),"StudioCyan",coll,bevel=.018)
    # An editorial grid on the upper side wall echoes a studio pin-up rail.
    for side in (-1,1):
        sx=31+side*4.21
        box("StudioDSRSideCourse",(sx,4.63,-23.35),(.08,.10,7.45),"StudioInk",coll,bevel=0)
        for pz in (-25.75,-20.65):
            box("StudioDSRSideGlazing",(sx,2.8,pz),(.08,2.35,1.40),"RiverBlue",coll,bevel=.01)
            for dz in (-.74,.74):
                box("StudioDSRSideJamb",(sx+side*.035,2.8,pz+dz),(.10,2.5,.07),"StudioInk",coll,bevel=0)
    # Office plants reference DSR's conspicuously plant-filled real studio.
    for px in (27.2,34.8):
        cyl("StudioDSRPlanter",(px,.87,-18.9),.34,.68,"StudioInk",coll,vertices=10,bevel=.02)
        for dx,dy,dz in ((-.12,1.48,0),(.15,1.6,.05),(0,1.88,-.06)):
            env.sphere("StudioDSRPlant",(px+dx,dy,-18.9+dz),(.26,.39,.22),"StudioForest",coll)


def build(env, coll):
    """Build architecture only, using environment.py's shared helpers/materials."""
    box, cyl, beam = env.box, env.cyl, env.cable_between

    studio_materials(env)
    qualia(env, coll)
    dsr(env, coll)

    # BucklerX: split lab volumes form a sheltered service courtyard.
    x, z = BUCKLER_X, BUCKLER_Z
    box("StudioBucklerPlinth", (x, .25, z), (8, .5, 7), "Concrete", coll, bevel=.13)
    for side in (-1, 1):
        bx=x+side*2.5
        box("StudioBucklerLab", (bx, 2.55, z-.35), (2.8, 4.6, 5.85), "SandstoneCream", coll, bevel=.14)
        box("StudioBucklerGlass", (bx, 2.5, z+2.62), (2.2, 2.7, .14), "RiverBlue", coll, bevel=.02)
        box("StudioBucklerRoof", (bx, 5.0, z-.35), (3.1, .28, 6.2), "SandstoneViolet", coll, bevel=.06)
    box("StudioBucklerDoor", (x, 1.5, z+2.68), (2.0, 2.5, .16), "RiverBlue", coll, bevel=.02)
    box("StudioBucklerCourtyardCanopy", (x, 4.35, z+1.3), (2.25, .2, 2.8), "Bronze", coll, bevel=.045)
    for px in (x-.95, x+.95):
        cyl("StudioBucklerCanopyPost", (px, 2.25, z+2.35), .11, 4.1, "Concrete", coll, vertices=8)

    project_gallery.build(env, coll)

    # Side and rear facade articulation keeps the studios legible from every path.
    for prefix,x,z,w,d in (("StudioQualia",18,-25.65,9.2,7.7),("StudioBuckler",BUCKLER_X,BUCKLER_Z-.35,7.8,5.85)):
        for side in (-1,1):
            for dz in (-d*.28,0,d*.28):
                box(prefix+"SideReveal",(x+side*(w/2+.02),2.5,z+dz),(.10,2.1,1.45),"RiverBlue",coll,bevel=.012)
                for oy in (-1.08,1.08): box(prefix+"SideTrim",(x+side*(w/2+.07),2.5+oy,z+dz),(.20,.14,1.65),"SandstoneCream",coll,bevel=.01)
                box(prefix+"SideMullion",(x+side*(w/2+.10),2.5,z+dz),(.14,2.15,.08),"Bronze",coll,bevel=0)
        for dx in (-w*.3,0,w*.3):
            box(prefix+"RearWindow",(x+dx,2.55,z-d/2-.04),(1.45,2.05,.1),"RiverBlue",coll,bevel=.012)
            box(prefix+"RearShade",(x+dx,3.66,z-d/2-.25),(1.7,.15,.55),"SandstoneCream",coll,bevel=.01)
    for px in (x-2.5,x+2.5):
        box("StudioBucklerVent",(px,4.4,z+3.02),(2.35,.42,.12),"Metal",coll,bevel=.015)
        for dx in (-.8,-.4,0,.4,.8): box("StudioBucklerVentLouver",(px+dx,4.4,z+3.11),(.08,.34,.14),"Concrete",coll,bevel=0)
    for px in (x-.45,x+.45):
        box("StudioBucklerDoorFrame",(px,1.6,z+2.78),(.08,2.5,.12),"Concrete",coll,bevel=0)
