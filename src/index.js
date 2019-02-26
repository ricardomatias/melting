'use strict';

/* eslint no-console: 0*/

/* exported preload setup draw windowResized */
var presets = new PresetsManager();

var sketch = new Sketch();

var paletteStudio = new PaletteStudio({
	pairs: [
		[ '#FAFCD9', '#FC4416' ],
		[ '#C02942', '#ECD078' ],
		[ '#1f1e2a', '#FFFFFF' ],
		[ '#152B3C', '#E32D40' ],
		[ '#11644D', '#F2C94E' ]
	]
});

function createHeightMap(sections, maxHeight) {
	var heightMap = [];
	var bucket = maxHeight;
	var map = 0;
	var lastFills = [ 0.25, 0.4, 0.20, 0.1, 0.05 ];

	for (var currentSection = 0; currentSection <= sections; currentSection++) {
		var pick = round(min(MathUtils.randomInt(20, bucket), bucket / 6));

		if (currentSection === sections - 4) {
			lastFills = lastFills.map((attribution) => (
				round(attribution * bucket)
			));
		}

		if (currentSection >= sections - 2) {
			pick = lastFills.pop();
		}

		if (random() > 0.4) {
			heightMap.push({
				y: map,
				height: pick,
				type: 'MELT',
			});
		} else {
			heightMap.push({
				y: map,
				height: pick,
				type: 'ORIGINAL',
			});
		}

		bucket -= pick;
		map += pick;
	}
	return heightMap;
}

const IMAGES_NR = 3;

sketch.preload(function() {
	// REGISTER PRESETS
	presets.registerMultiple(['slit-scan'], {
		images: [
			loadImage('assets/img/hands.jpg'),
			loadImage('assets/img/elk.jpg'),
			loadImage('assets/img/space-odyssey.jpg'), 
			loadImage('assets/img/collage.jpg')
		],
		activeImage: 0,
	});
});


sketch.setup(function sketchSetup() {
	createCanvas(windowWidth, windowHeight);

	paletteStudio.setup();

	presets.setup('slit-scan', function(defaults) {
		defaults.image = defaults.images[MathUtils.randomInt(0, IMAGES_NR)];

		var img = defaults.image,
				imageWidth = img.width,
				imageHeight = img.height;

		defaults.imageWidth = imageWidth;
		defaults.imageHeight = imageHeight;
		defaults.canvas = createGraphics(img.width, img.height);
		defaults.canvasX = 0;
		defaults.canvasY = 0;
		defaults.yoff = 0.1;
		defaults.scanLine = 0;

		defaults.canvas.pixelDensity(1);

		// to remove DARKEN, MULTIPLY, REPLACE, BURN, DODGE, SOFT_LIGHT
		defaults.BLEND_MODES = [
			BLEND, LIGHTEST,
			DIFFERENCE, EXCLUSION,
			SCREEN,
			HARD_LIGHT, ADD
		];
		defaults.blendMode = defaults.BLEND_MODES[0];

		resizeCanvas(imageWidth, imageHeight);
	});

	presets.setup([ 'simple', 'complex' ], function(defaults) {
		defaults.image = defaults.images[0];

		var img = defaults.image,
				imageWidth = img.width,
				imageHeight = img.height;

		defaults.noiseStart = 0.0;
		defaults.prevResults = {};

		// to remove DARKEN, MULTIPLY, REPLACE, BURN, DODGE, SOFT_LIGHT
		defaults.BLEND_MODES = [
			BLEND, LIGHTEST,
			DIFFERENCE, EXCLUSION,
			SCREEN,
			HARD_LIGHT, ADD
		];
		defaults.blendMode = defaults.BLEND_MODES[0];

		resizeCanvas(imageWidth, imageHeight);
	});

	presets.select('slit-scan');
});

sketch.draw(function sketchDraw()  {
	// VISUALS
	blendMode(NORMAL);

	presets.draw('simple', function(defaults) {
		const img = defaults.image,
					imageWidth = defaults.imageWidth;

		var prevResults = defaults.prevResults,
				noiseStart = defaults.noiseStart;

		noLoop();

		img.loadPixels();

		const DX_MAX = 250;
		const SCAN_LINE = 10;
		const ROWS = Math.floor(height / SCAN_LINE);

		var rnd = noise(noiseStart);

		for (var y = 1; y <= ROWS; y++) {
			var dx = round(noise(rnd) * DX_MAX);
			var finalWidth = width - dx;
			var srcX, srcY, srcWidth, srcHeight,
					destX, destY, destHeight, destWidth;

			if (y === 1 || random() > 0.5) {
				srcX = 0;
				srcY = y * SCAN_LINE;
				srcWidth = imageWidth;
				srcHeight = y * SCAN_LINE;
				destX = dx / 2;
				destY = (y - 1) * SCAN_LINE;
				destWidth = finalWidth;
				destHeight = y * SCAN_LINE;
			} else {
				srcX = prevResults.srcX;
				srcY = prevResults.srcY;
				srcWidth = prevResults.srcWidth;
				srcHeight = prevResults.srcHeight;
				destX = dx / 2;
				destY = (y - 1) * SCAN_LINE;
				destWidth = finalWidth;
				destHeight = y * SCAN_LINE;
			}

			copy(
				img,
				srcX, srcY, // SRC x, y (Left anchor)
				srcWidth, srcHeight, // SRC width, height
				destX, destY, // DEST x, y
				destWidth, destHeight); // DEST width, height

			prevResults = {
				srcX: srcX,
				srcY: srcY,
				srcWidth: srcWidth,
				srcHeight: srcHeight,
				destX: destX,
				destY: destY,
				destWidth: destWidth,
				destHeight: destHeight,
			};

			rnd += 0.1;
		}
		defaults.noiseStart += 0.1;
	}, this);

	presets.draw('complex', function(defaults) {
		const img = defaults.image,
					imageWidth = defaults.imageWidth,
					imageHeight = defaults.imageHeight;

		var noiseStart = defaults.noiseStart;

		noLoop();

		blendMode(defaults.blendMode);

		background('#000');

		image(img, 0, 0);

		img.loadPixels();

		const DX_MAX = 10;
		const HEIGHT_MAP = createHeightMap(MathUtils.randomInt(5, 15), imageHeight);


		// create height map
		// > sections for melting + untouched sections
		// each sections for meltin:
		// - Start with a random Scanline based on noise and increase it
		for (var index = 0; index < HEIGHT_MAP.length; index++) {
			var section = HEIGHT_MAP[index];
			var srcX, srcY, srcWidth, srcHeight,
					destX, destY, destHeight, destWidth;

			if (section.type === 'MELT') {
				var rows = MathUtils.randomInt(1, 10);
				var scanLine = round(section.height / rows);
				var rnd = noise(noiseStart);

				for (var y = 1; y <= rows; y++) {
					var dx = round(noise(rnd) * DX_MAX);
					var finalWidth = imageWidth - dx;

					srcX = 0;
					srcY = section.y;
					srcWidth = imageWidth;
					srcHeight = scanLine;
					destX = round(dx / 2);
					destY = round(section.y + ((y - 1) * scanLine));
					destWidth = finalWidth;
					destHeight = scanLine;

					copy(
						img,
						srcX, srcY, // SRC x, y (Left anchor)
						srcWidth, srcHeight, // SRC width, height
						destX, destY, // DEST x, y
						destWidth, destHeight); // DEST width, height

					rnd += 0.5;
				}
			} else {
				copy(
					img,
					0, section.y, // SRC x, y (Left anchor)
					imageWidth, section.height, // SRC width, height
					0, section.y, // DEST x, y
					imageWidth, section.height); // DEST width, height
			}
		}

		// image(img);
		//
		// ADD, SCREEN, HARD_LIGHT,
		// blend(img, 0, 0, imageWidth, imageHeight, 0, 0, imageWidth, imageHeight, SCREEN);
	}, this);

	presets.draw('slit-scan', function(defaults) {
		const img = defaults.image,
					imageWidth = defaults.imageWidth,
					imageHeight = defaults.imageHeight,
					canvas = defaults.canvas,
					yoff = defaults.yoff,
					scanLine = defaults.scanLine;

		const newCanvasY = round(map(noise(yoff), 0.0, 1.0, -5, 5));

		defaults.canvasY += newCanvasY;

		const canvasY = defaults.canvasY;

		blendMode(defaults.blendMode);

		canvas.image(img, 0, canvasY, imageWidth, imageHeight);

		canvas.loadPixels();

		fill(paletteStudio.fillColor);
		// rect(0, scanLine, width, 10);

		copy(
			canvas,
			0, 0, // SRC x, y (Left anchor)
			imageWidth, 1, // SRC width, height
			0, scanLine, // DEST x, y
			imageWidth, 2); // DEST width, height

		defaults.scanLine += 1;

		defaults.yoff += 0.01;

		if (canvasY > imageHeight) {
			defaults.canvasY = 0;
		}

		if (canvasY < -imageHeight) {
			defaults.canvasY = 0;
		}

		if (scanLine > imageHeight) {
			defaults.scanLine = 0;
			canvas.background('#000');
		}
	});
});

// SHORTCUTS
sketch.registerShortcuts([
	{
		key: 'w',
		action: function() {
			redraw();

			presets.selectPrevious();
		}
	},
	{
		key: 's',
		action: function() {
			redraw();

			presets.selectNext();
		}
	},
	{
		key: 'r',
		action: function() {
			redraw();

			presets.selectRandom();
		}
	},
	{
		key: 'h',
		action: function() {
			Helpers.hideClutter();
		}
	},
	{
		key: 'Space',
		action: function() {
			const preset = presets.getActivePreset();
			const defaults = preset.defaults;

			defaults.activeImage = defaults.activeImage === IMAGES_NR ?
															0 :
															defaults.activeImage + 1;
			defaults.image = defaults.images[defaults.activeImage];
			defaults.imageWidth = defaults.image.width;
			defaults.imageHeight = defaults.image.height;

			defaults.canvas = createGraphics(defaults.imageWidth, defaults.imageHeight);
			defaults.canvasY = 0;
			defaults.yoff = 0.1;
			defaults.scanLine = 0;

			resizeCanvas(defaults.imageWidth, defaults.imageHeight);

			redraw();
		}
	},
	{
		key: 'Enter',
		action: function() {
			const preset = presets.getActivePreset();

			sketch.takeScreenshot(preset.name);
		}
	},
	{
		key: 'b',
		action: function() {
			const preset = presets.getActivePreset();
			const defaults = preset.defaults;
			const lotteryDraw = MathUtils.randomInt(0, defaults.BLEND_MODES.length - 1);
			const newBlendMode = defaults.BLEND_MODES[lotteryDraw];

			defaults.blendMode = newBlendMode;
			console.log('newBlendMode', newBlendMode);
			redraw();
		}
	}
]);

function preload() {
	sketch.preload();
}

function setup() {
	sketch.setup();
}

function draw() {
	sketch.draw();
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
}
