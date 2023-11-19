import { Players } from './player.js';

export const scene_widthx = 18800; // ???m
export const scene_heightx = 280;
 /** @type {Chipmunk2DWorld} */
export var world;

const GRABABLE_MASK_BIT = 1 << 31;
const NOT_GRABABLE_MASK = ~GRABABLE_MASK_BIT;

let DISPLACEMENT = 0; // reference point for rendering, follows player vehicle position
const MARGIN = 175; // how much of a margin between the player and the left edge of canvas

const MAX_GAME_TIME = 36; // 30s

const xstep = 200;
let ground = [];
let gndShape = [];
let finishFlag = [];
let finishShape = [];

/// Station Parameters ////
// var stationShape = [];
// var station = [];
// var stationPosX = [17 * 200];
// var stationPosY = [0];
// var stationData = [30, 120, 20, 10];
// var chrageBatt = 20;
// var isCharging = false;
// var lastChargingX = 0;
//////////////////////////


// **** Draw methods for Shapes
cp.PolyShape.prototype.draw = function (ctx, scale, point2canvas) {
    ctx.beginPath();

    var verts = this.tVerts;
    var len = verts.length;
    var lastPoint = point2canvas(new cp.Vect(verts[len - 2], verts[len - 1]));
    ctx.moveTo(lastPoint.x - DISPLACEMENT, lastPoint.y);

    for (var i = 0; i < len; i += 2) {
        var p = point2canvas(new cp.Vect(verts[i], verts[i + 1]));
        ctx.lineTo(p.x - DISPLACEMENT, p.y);
    }

    if (this.flag) {
        ctx.fillStyle = 'rgba(255,255,255, 0.1)';
        ctx.strokeStyle = 'rgba(0,0,0, 0.2)';
    } else {
        // car shape
        // 		ctx.lineWidth = 5;
        // ctx.fillStyle = '#222222'; // max changed the color to fit the other elements
        // 		ctx.strokeStyle = '#f9f9f9';
    }
    ctx.fill();
    ctx.stroke();
};

cp.SegmentShape.prototype.draw = function (ctx, scale, point2canvas) {
    let a = point2canvas(this.ta);
    let b = point2canvas(this.tb);
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(a.x - DISPLACEMENT, a.y);
    ctx.lineTo(b.x - DISPLACEMENT, b.y);
    if (this.flag) {
        ctx.strokeStyle = 'rgba(255,0,0, 0.2)';
    } else {
        // ctx.strokeStyle = "rgba(0,0,0, 1)";
    }
    ctx.stroke();
};

cp.CircleShape.prototype.draw = function (ctx, scale, point2canvas) {
    let c = point2canvas(this.tc);
    ctx.beginPath();
    ctx.arc(c.x - DISPLACEMENT, c.y, scale * this.r, 0, 2 * Math.PI, false);
    if (this.flag && this.sensor) {
        ctx.fillStyle = 'rgba(0,0,0, 0.2)';
        ctx.strokeStyle = 'rgba(0,0,0,0)';
    } else if (this.sensor) {
        ctx.fillStyle = 'rgba(0,0,0, 1)';
        ctx.strokeStyle = 'rgba(0,0,0, 0)';
    } else {
        ctx.fillStyle = 'rgba(0,0,0, 1)';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#e9e9e9';
    }
    ctx.fill();
    ctx.stroke();

    // And draw a little radian so you can see the circle roll.
    let a = point2canvas(this.tc);
    let b = point2canvas(cp.v.mult(this.body.rot, this.r).add(this.tc));
    ctx.beginPath();
    ctx.moveTo(a.x - DISPLACEMENT, a.y);
    ctx.lineTo(b.x - DISPLACEMENT, b.y);
    ctx.stroke();
};


/**
 * Wrapper class around a Chimpunk.js (ported from Chipmunk Game Dynamics in C) physics simulation engine.
 * At this time, chimpunk.js corresponds to version 6.1.1, and uses the same API as the C language version.
 * The C language API is documented here {@link https://files.slembcke.net/chipmunk/release/Chipmunk-6.x/Chipmunk-6.1.1-Docs/}
 * The minor adaptation of C API to JS is described here {@link https://github.com/josephg/Chipmunk-js}
 * 
 * This class was adapted from the /demo/demo.js file in the Chipmunk-js project on github.
 * 
 * This provides:
 *    - convenience functions for adding high level objects to the engine
 *    - logic to render all the shapes added to the engine
 *    - scaling and translating of the dimensions between the engine and an HTML <canvas> element
 *    - code specific to the game logic to determine game-over conditions
 */
export class Chipmunk2DWorld {
    /**
     * @param {string} canvas_id - the CSS query selector for a Canvas element to use as a rendering output.
     */
    constructor(canvas_id) {
        // Core components
        this.space = new cp.Space();
        this.canvas = document.getElementById(canvas_id);
        this.ctx = this.canvas.getContext('2d');

        // Resize
        // this.canvas.width = this.width = scene_widthx / 15;
        // this.canvas.height = this.height = (scene_heightx * 2) / 3;
        this.canvas.width = this.width = scene_widthx / 12;
        this.canvas.height = this.height = scene_heightx;
        this.scale = 1.0;
        this.resized = true;

        this.space.iterations = 10;
        this.space.gravity = cp.v(0, -400);
        this.space.sleepTimeThreshold = 100;

        this.#AddGround(data, scene_widthx, xstep);
        this.#AddFinishLine(scene_widthx - 3 * xstep);

        let posA = cp.v(50, 0);
        let posB = cp.v(110, 0);
        this.boxOffset = cp.v(100, 10);

        this.ai = Players.AI;
        this.ai.AttachToChipmunk2DWorld(this, posA, posB);
        this.player = Players.HUMAN;
        this.player.AttachToChipmunk2DWorld(this, posA, posB);

        world = this;

    }

    /**
     * Obtain a position that accounts for boxOffset
     * @param {cp.Vect} pos - to position to translate
     * @returns {cp.Vect} the translated position.
     */
    POS = (pos) => {
        return cp.v.add(this.boxOffset, pos);
    };

    /**
     * Add a body and shape to the engine representing a Bar.
     * @param {cp.Vect} pos - the location to place the body and shape.
     * @returns {cp.Body} the body that was added
     */
    AddBar = (pos) => {
        let mass = 1 / m2m; // 1kg
        let a = cp.v(0, 10);
        let b = cp.v(0, -10);

        let body = this.space.addBody(new cp.Body(mass, cp.momentForSegment(mass, a, b)));
        body.setPos(cp.v.add(pos, this.boxOffset));

        let shape = this.space.addShape(new cp.SegmentShape(body, a, b, 1));
        shape.setElasticity(0);
        shape.setFriction(0.7);
        shape.group = 1; // use a group to keep the car parts from colliding
        return body;
    };

    /**
     * Add a body and shape to the engine representing a Wheel
     * @param {cp.Vect} pos - the location to place the body and shape
     * @returns {cp.Body} the body that was added
     */
    AddWheel = (pos) => {
        let radius = 12;
        let mass = 20 / m2m; // 20kg
        let body = this.space.addBody(new cp.Body(mass, cp.momentForCircle(mass, 0, radius, cp.v(0, 0))));
        body.setPos(cp.v.add(pos, this.boxOffset));

        let shape = this.space.addShape(new cp.CircleShape(body, radius, cp.v(0, 0)));
        shape.setElasticity(0);
        shape.setFriction(1e1);
        shape.group = 1; // use a group to keep the car parts from colliding

        return body;
    };

    /**
     * Add a body and shape to the engine representing a Vehicle Chassis
     * @param {cp.Vect} pos - the location to place the body and shape
     * @param {string} style - a CSS style string, mainly color, to use when rendering the shapes.
     * @returns {cp.Body} the body that was added
     */
    AddChassis = (pos, style = 'black') => {
        let mass = 1500 / m2m; // 1500 kg
        let width = 4 / px2m; // --> 3.5m length
        let height = 1.8 / px2m; // --> 1.0m height

        let body = this.space.addBody(new cp.Body(mass, cp.momentForBox(mass, width, height)));
        body.setPos(cp.v.add(pos, this.boxOffset));

        let shape = this.space.addShape(new cp.BoxShape(body, width, height, cp.v(0, 0)));
        shape.style = style;
        shape.setElasticity(0);
        shape.setFriction(0.7);
        shape.group = 1; // use a group to keep the car parts from colliding

        return body;
    };

    /**
     * Reset any and all internal variables.
     * // TODO: Need to reset the engine at some point.
     */
    Reset = () => {
        this.player.Reset();
        this.ai.Reset();
    };

    /**
     * Advance the simulation by @param dt seconds, then check for terminating conditions.
     * @param {number} dt - the amount of time to advance, in seconds.
     */
    Update = (dt) => {
        if( ! this.running ) return;

        const SPEED_UP_FACTOR = 60/48; // old code had tick size different from frame rate.
        this.space.step(dt * SPEED_UP_FACTOR);

        if (this.simTime === undefined) {
            this.simTime = 0;
        } else {
            this.simTime += dt;
        }
        $('#timeval').html((MAX_GAME_TIME - this.simTime).toFixed(1));

        this.player.UpdateVariables();
        this.ai.UpdateVariables();

        let car_pos = Math.round(this.player.XPosition() * px2m);

        // check for terminating conditions
        // player crossing the finish line
        if (car_pos >= MAX_DISTANCE) {
            this.Stop();
            this.player.SuspendVehicle();
            if (!this.player.IsBattEmpty()) {
                messagebox('Congratulations!', true);
            } else {
                messagebox('Good job but try to save battery!', false);
            }
        }
        // player runs out of time
        else if (this.simTime > MAX_GAME_TIME) {
            this.Stop();
            this.player.SuspendVehicle();
            messagebox('Time out! Please restart.', false);
        }
        // player went backwards
        else if (car_pos < 1) {
            this.Stop();
            this.player.SuspendVehicle();
            messagebox("Can't go back! Please restart.", false);
        }
        // player went underground
        else if (this.player.YPosition() < 0) {
            this.Stop();
            this.player.SuspendVehicle();
            messagebox('Oops...', false);
        }
        // TODO: not sure what this is checking for
        else if (this.player.chassis.rot.x < 0) {
            this.Stop();
            this.player.SuspendVehicle();
            messagebox('The driver is too drunk!', false);
        }
        // battery is empty, we are slow/stopped, and too far from the finish line
        else if (this.player.IsBattEmpty() && Math.abs(this.player.chassis.vx) <= 2 && car_pos < MAX_DISTANCE) {
            this.Stop();
            this.player.SuspendVehicle();
            messagebox('The battery is messed up!', false);
        }
    };

    /**
     * Convert canvas coordinates to physics engine coordinates
     * @param {number} x - x position on canvas
     * @param {number} y - y position on canvas
     * @returns {cp.Vect} the engine coordinates
     */
    Canvas2Point = (x, y) => {
        let rect = canvas.getBoundingClientRect(); //so canvas can be anywhere on the page
        return cp.v(x / this.scale - rect.left, this.height - y / this.scale + rect.top);
    };

    /**
     * Convert physics engine coordinates to canvas coordinates
     * @param {cp.Vect} point - the physics engine coordinates
     * @returns {cp.Vect} the canvas coordinates
     */
    Point2Canvas = (point) => {
        let vector = cp.v(point.x * this.scale, (this.height - point.y) * this.scale);
        return vector;
    };

    /**
     * Render the physics engine shapes onto the canvas using the 2D context interface.
     */
    Draw = () => {
        let ctx = this.ctx;
        let canvas = this.canvas;

        DISPLACEMENT = this.player.XPosition() - MARGIN;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Setup default styles
        ctx.font = '24px serif';
        ctx.strokeStyle = 'black';
        
        // Draw shapes
        this.space.eachShape((shape) => {
            // console.log(shape);
            ctx.save();
            // console.log(ctx.fillStyle, shape.style);
            ctx.fillStyle = shape.style;
            ctx.strokeStyle = ctx.fillStyle;
            shape.draw(ctx, this.scale, this.Point2Canvas);
            ctx.restore();
        });

        let ai_x_pos = this.ai.XPosition();
        let player_x_pos = this.player.XPosition();
        const MIN_POSITION_DIFF = scene_widthx * 0.03; // 3% of the track
        
        if( (ai_x_pos - player_x_pos) > MIN_POSITION_DIFF ){
            // we are too far behind!!!
            // get position of vehicle body
            let where = this.Point2Canvas(this.player.chassis.p);
            where.x -= DISPLACEMENT;
            // pick a spot above the vehicle
            ctx.fillText("Hurry UP!!!", where.x - 80, where.y - 40);
            // pick a spot in front of the vehicle (top of chevron lines)
            where.x += 50;
            where.y -= 20;
            this.#DrawChevrons(where, 10);
        } else if ((player_x_pos - ai_x_pos) > MIN_POSITION_DIFF){
            // we are too far ahead!!!
            let where = this.Point2Canvas(this.player.chassis.p);
            where.x -= DISPLACEMENT;
            // pick a spot above the vehicle
            ctx.fillText("Slow DOWN!!!", where.x - 80, where.y - 40);
            // pick a spot behind the vehicle (top of chevron lines)
            where.x -= 50;
            where.y -= 20;
            // this.#DrawReverseChevron(where);
            this.#DrawChevrons(where, -10);
        }

        // this.space.eachConstraint((c) => {
            // if (c.draw) {
            //     c.draw(ctx, this.scale, this.Point2Canvas);
            // }
        // });
    };

    /**
     * Enables the game world, should be called when we wish to begin the timer and physics simulations to run.
     */
    Run = () => {
        this.running = true;
        this.simTime = undefined;
    };

    /**
     * Disable the game world.
     */
    Stop = () => {
        this.running = false;
    };

    /**
     * Private function to add the ground/road shapes to the engine, based on a given dataset for elevations.
     * @param {Array<number>} data - the elevation dataset
     * @param {number} scene_widthx - the width of the world
     * @param {number} xstep - the width of each data point in @param data
     */
    #AddGround = (data, scene_widthx, xstep) => {
        // add provided track data
        for (var i = 0; i < scene_widthx / xstep - 3; i++) {
            gndShape[i] = new cp.SegmentShape(this.space.staticBody, cp.v(i * xstep, data[i]), cp.v((i + 1) * xstep, data[i + 1]), 0);
            ground[i] = this.space.addShape(gndShape[i]);
            ground[i].setElasticity(0);
            ground[i].setFriction(0.1);
            ground[i].layers = NOT_GRABABLE_MASK;
        }

        // extra floor to complete the scene
        for (var j = i; j < i + 6; j++) {
            gndShape[j] = new cp.SegmentShape(this.space.staticBody, cp.v(j * xstep, data[i]), cp.v((j + 1) * xstep, data[i + 1]), 0);
            ground[j] = this.space.addShape(gndShape[j]);
            ground[j].setElasticity(0);
            ground[j].setFriction(0.1);
            ground[j].layers = NOT_GRABABLE_MASK;
        }
    };

    /**
     * Private function to add the finish line to the engine
     * @param {number} distance - the X position, in engine coordinates, to place the finish line at.
     */
    #AddFinishLine = (distance) => {
        finishShape[0] = new cp.SegmentShape(this.space.staticBody, cp.v(distance, 0), cp.v(distance, scene_heightx), 0);
        finishFlag[0] = this.space.addShape(finishShape[0]);
        finishFlag[0].flag = true;
        finishFlag[0].sensor = true;
    };

    /**
     * == Future == : function for adding charging station(s) to the track.
     * @param {number} distance - x position
     * @param {number} elevation - y position
     */
    #AddStation = (distance, elevation) => {
        var space = this.space;
        var staticBody = space.staticBody;
        /*stationShape[0] = new cp.BoxShape(staticBody, stationData[2], stationData[3], cp.v(distance,45));
        station[0] = space.addShape(stationShape[0]);
        station[0].flag = true;
        station[0].sensor = true;*/

        stationShape[0] = new cp.CircleShape(staticBody, 10, cp.v(distance, elevation + 40));
        station[0] = space.addShape(stationShape[0]);
        station[0].flag = true;
        station[0].sensor = true;

        stationShape[0] = new cp.CircleShape(staticBody, 2, cp.v(distance + 5, elevation + 40));
        station[0] = space.addShape(stationShape[0]);
        //station[0].flag = true;
        station[0].sensor = true;

        stationShape[0] = new cp.CircleShape(staticBody, 2, cp.v(distance - 5, elevation + 40));
        station[0] = space.addShape(stationShape[0]);
        //station[0].flag = true;
        station[0].sensor = true;

        stationShape[0] = new cp.BoxShape(staticBody, stationData[0], stationData[1], cp.v(distance, elevation));
        station[0] = space.addShape(stationShape[0]);
        station[0].flag = true;
        station[0].sensor = true;
    };

    frames_per_alpha = 60;
    alpha_frame = 0;

    /**
     * Draw some chevrons beginning at the provided canvas coordinates.
     * @param {cp.Vect} where - where to start drawing
     * @param {number} x_step - the amount of x offset to use, positive leads to right pointing chevron, negative to left pointing.
     */
    #DrawChevrons = ( where, x_step ) => {
        let ctx = this.ctx;

        // prepare to draw
        ctx.beginPath();
        ctx.lineWidth = 5;
        // the chevron animation uses a sine function for transparency (alpha)
        // since alpha is in range [0,1], and sin() is [-1,1], we scale and shift the sin() curve.
        let a = 0.5 + (0.5 * Math.sin(2*Math.PI*(this.alpha_frame/this.frames_per_alpha)));
        ctx.strokeStyle = 'rgba(255,0,0,'+a+')';
        this.alpha_frame = (this.alpha_frame + 1) % this.frames_per_alpha;

        // draw the 3 chevrons
        for(let i=0; i<3; i++){
            where.x += 2*x_step;
            ctx.moveTo(where.x, where.y);
            ctx.lineTo(where.x + x_step, where.y + 10);
            ctx.lineTo(where.x, where.y + 20);
        }

        ctx.stroke();
    }
}