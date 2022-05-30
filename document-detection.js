const processImage = function (canvas) {
    let src = cv.imread(canvas);
    let dst = new cv.Mat();
    let origin = src.clone();

    // make it let dst = new cv.Mat();gray scale
    cv.cvtColor(src, dst, cv.COLOR_RGB2GRAY);

    // apply gauss filter (make it blurry)
    let ksize = new cv.Size(5, 5);
    cv.GaussianBlur(dst, dst, ksize, 0, 0, cv.BORDER_DEFAULT);
    cv.GaussianBlur(dst, dst, ksize, 0, 0, cv.BORDER_DEFAULT);
    
    // apply canny filter
    cv.Canny(dst, dst, 50, 100, 3, true);

    // dilate and erode (make edges thicker)
    let kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    let anchor = new cv.Point(-1, -1);
    cv.dilate(dst, dst, kernel, anchor, 2)
    cv.erode(dst, dst, kernel, anchor, 1);

    // find contours
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    console.log("contour size", contours.size());
    const [rectangleContour, rectangleApprox] = findBiggestRectangle(contours)
    cv.drawContours(origin, contours, -1, [0, 255, 0, 255], 1, cv.LINE_8, hierarchy, 100);
    dst.delete();
    contours.delete();
    hierarchy.delete();

    const documentCoords = {};

    if (rectangleContour) {
        var pos = 0;
        documentCoords.p1 = new cv.Point(rectangleApprox.intAt(pos++), rectangleApprox.intAt(pos++));
        documentCoords.p2 = new cv.Point(rectangleApprox.intAt(pos++), rectangleApprox.intAt(pos++));
        documentCoords.p3 = new cv.Point(rectangleApprox.intAt(pos++), rectangleApprox.intAt(pos++));
        documentCoords.p4 = new cv.Point(rectangleApprox.intAt(pos++), rectangleApprox.intAt(pos++));
        cv.line(origin, documentCoords.p1, documentCoords.p2, [255, 50, 50, 255], 4);
        cv.line(origin, documentCoords.p2, documentCoords.p3, [255, 50, 50, 255], 4);
        cv.line(origin, documentCoords.p3, documentCoords.p4, [255, 50, 50, 255], 4);
        cv.line(origin, documentCoords.p4, documentCoords.p1, [255, 50, 50, 255], 4);
        rectangleApprox.delete();
    }


    // show the image
    cv.imshow('canvasOutput', origin);
    origin.delete();
    src.delete();
    return documentCoords;
};

function findBiggestRectangle(contours) {
    var biggestIndex = 0;
    var biggestRectangleArea = 0;
    var biggestApprox;
    for (var i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const currentRectangleArea = cv.contourArea(contour);
        if (currentRectangleArea > biggestRectangleArea) {
            const perimeter = cv.arcLength(contour, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);
            if (approx.total() === 4) {
                biggestIndex = i;
                biggestRectangleArea = currentRectangleArea;
                if (biggestApprox) {
                    biggestApprox.delete();
                }
                biggestApprox = approx;
            } else {
                approx.delete();
            }
        }
    }
    return [contours.get(biggestIndex), biggestApprox];
}

function cutOutDocument(src, documentCoords) {
    let transformedImage = new cv.Mat();
    transform(src, transformedImage, documentCoords);
    cv.imshow('transformedOutput', transformedImage)
    transformedImage.delete();
}

function transform(sourceImage, destinationImage, documentCoords) {
    //Order the corners
    let cornerArray = [{ corner: documentCoords.p1 }, { corner: documentCoords.p2 }, { corner: documentCoords.p3 }, { corner: documentCoords.p4 }];
    //Sort by Y position (to get top-down)
    cornerArray.sort((item1, item2) => { return (item1.corner.y < item2.corner.y) ? -1 : (item1.corner.y > item2.corner.y) ? 1 : 0; }).slice(0, 5);

    //Determine left/right based on x position of top and bottom 2
    let tl = cornerArray[0].corner.x < cornerArray[1].corner.x ? cornerArray[0] : cornerArray[1];
    let tr = cornerArray[0].corner.x > cornerArray[1].corner.x ? cornerArray[0] : cornerArray[1];
    let bl = cornerArray[2].corner.x < cornerArray[3].corner.x ? cornerArray[2] : cornerArray[3];
    let br = cornerArray[2].corner.x > cornerArray[3].corner.x ? cornerArray[2] : cornerArray[3];

    //Calculate the max width/height
    let widthBottom = Math.hypot(br.corner.x - bl.corner.x, br.corner.y - bl.corner.y);
    let widthTop = Math.hypot(tr.corner.x - tl.corner.x, tr.corner.y - tl.corner.y);
    let theWidth = (widthBottom > widthTop) ? widthBottom : widthTop;
    let heightRight = Math.hypot(tr.corner.x - br.corner.x, tr.corner.y - br.corner.y);
    let heightLeft = Math.hypot(tl.corner.x - bl.corner.x, tr.corner.y - bl.corner.y);
    let theHeight = (heightRight > heightLeft) ? heightRight : heightLeft;

    //Transform!
    let finalDestCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, theWidth - 1, 0, theWidth - 1, theHeight - 1, 0, theHeight - 1]); //
    let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.corner.x, tl.corner.y, tr.corner.x, tr.corner.y, br.corner.x, br.corner.y, bl.corner.x, bl.corner.y]);
    let dsize = new cv.Size(theWidth, theHeight);
    let M = cv.getPerspectiveTransform(srcCoords, finalDestCoords)
    cv.warpPerspective(sourceImage, destinationImage, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
}

function calculateDownsizeFactor(width, height) {
    const optimalProcessingPixelCount = 500000;
    const cameraPixelCount = width * height;
    return Math.sqrt(cameraPixelCount / optimalProcessingPixelCount);
}