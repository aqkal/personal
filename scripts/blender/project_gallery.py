"""Open, walk-in project gallery with five individually framed exhibition bays."""


def build(env, coll):
    box, cyl = env.box, env.cyl
    env.SOLID_BOX_NAMES.update({
        "EngineeringGalleryBack", "EngineeringGallerySide", "EngineeringBayDivider",
        "EngineeringGalleryCanopy", "EngineeringGalleryHeader", "EngineeringGalleryFloor",
    })
    # A low, flush threshold lets the same continuous aisle serve every project.
    box("EngineeringGalleryFloor", (27, .06, 22), (22.2, .12, 8.2), "Concrete", coll, bevel=.04)
    box("EngineeringGalleryBack", (27, 2.62, 25.9), (22.2, 5, .26), "StudioInk", coll, bevel=.05)
    # Wider end clearances and low, short returns keep the complete project
    # headings visible from the front aisle and oblique approach views.
    for x in (16.0, 38.0):
        box("EngineeringGallerySide", (x, 1.16, 24.72), (.2, 2.08, 2.35), "StudioWhite", coll, bevel=.04)
        box("EngineeringEndWindow", (x, 1.16, 23.52), (.16, 1.65, .10), "StudioCyan", coll, bevel=.01)
    # Five recessed bays have a shared open aisle. No opaque glass boxes or core
    # stand between the visitor and the work. The open roof keeps the follow
    # camera and the miniature models visible from the normal overhead view.
    accents = ("StudioCyan", "StudioLavender", "ConstructionYellow", "SandstoneViolet", "StudioForest")
    for i, x in enumerate((18.6, 22.8, 27, 31.2, 35.4)):
        accent = accents[i]
        box("EngineeringBayBackdrop", (x, 2.65, 25.72), (3.95, 4.8, .09), accent, coll, bevel=.015)
        box("EngineeringBayLabelBacking", (x, 3.42, 25.65), (3.7, 1.5, .10), "StudioInk", coll, bevel=.025)
        box("EngineeringBayInset", (x, .129, 23.5), (3.9, .018, 3.9), "StudioWhite", coll, bevel=0)
        box("EngineeringBayThreshold", (x, .143, 21.63), (3.86, .018, .09), accent, coll, bevel=0)
        box("EngineeringGalleryCanopy", (x, 5.17, 24.93), (4.15, .24, 2.35), "StudioWhite", coll, bevel=.04)
        box("EngineeringRoofEdge", (x, 5.3, 23.75), (4.15, .08, .14), accent, coll, bevel=.01)
    for x in (20.7, 24.9, 29.1, 33.3):
        box("EngineeringBayDivider", (x, 1.39, 24.6), (.13, 2.55, 2.36), "StudioWhite", coll, bevel=.03)
    # A tall timber entrance frame gives the gallery a recognisable silhouette,
    # while every bay remains directly accessible through its open north face.
    for x in (16.25, 37.75):
        cyl("EngineeringColumn", (x, 2.7, 18.27), .14, 5.2, "Bronze", coll, vertices=8)
    box("EngineeringGalleryHeader", (27, 5.85, 25.9), (22.15, .78, .27), "StudioInk", coll, bevel=.035)
    box("EngineeringHeaderCap", (27, 6.29, 25.9), (22.35, .1, .55), "StudioWhite", coll, bevel=.02)
    box("EngineeringEntranceBeam", (27, 5.3, 18.25), (21.65, .13, .13), "Bronze", coll, bevel=.015)
    for x in (16.25, 20.7, 24.9, 29.1, 33.3, 37.75):
        box("EngineeringOpenRoofBeam", (x, 5.3, 21), (.12, .16, 5.65), "Bronze", coll, bevel=.015)
    for x in (18.1, 35.9):
        box("EngineeringEntryPlanter", (x, .41, 17.6), (1.55, .82, .64), "StudioForest", coll, bevel=.08)
        for dx in (-.42, 0, .42):
            env.sphere("EngineeringEntryPlant", (x+dx, .99, 17.6), (.31, .43, .28), "Foliage", coll)
