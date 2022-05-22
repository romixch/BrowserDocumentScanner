const processImage = function (canvas) {
    let src = cv.imread(canvas);
    let dst = new cv.Mat();
    let origin = src.clone();

    // make it gray scale
    cv.cvtColor(src, dst, cv.COLOR_RGB2GRAY);
    src.delete();

    // apply gauss filter (make it blurry)
    let ksize = new cv.Size(5, 5);
    cv.GaussianBlur(dst, dst, ksize, 0, 0, cv.BORDER_DEFAULT);
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

    if (rectangleContour) {
        console.log(rectangleContour);
        var pos = 0;
        const p1 = new cv.Point(rectangleApprox.intAt(pos++), rectangleApprox.intAt(pos++));
        const p2 = new cv.Point(rectangleApprox.intAt(pos++), rectangleApprox.intAt(pos++));
        const p3 = new cv.Point(rectangleApprox.intAt(pos++), rectangleApprox.intAt(pos++));
        const p4 = new cv.Point(rectangleApprox.intAt(pos++), rectangleApprox.intAt(pos++));
        cv.line(origin, p1, p2, [255, 50, 50, 255], 4);
        cv.line(origin, p2, p3, [255, 50, 50, 255], 4);
        cv.line(origin, p3, p4, [255, 50, 50, 255], 4);
        cv.line(origin, p4, p1, [255, 50, 50, 255], 4);
        console.log(rectangleApprox.row(0).data);
        console.log(rectangleApprox.row(1).data);
        console.log(rectangleApprox.row(2).data);
        console.log(rectangleApprox.row(3).data);
    }


    // show the image
    cv.imshow('canvasOutput', origin);
    origin.delete();
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
                biggestApprox = approx;
            }
        }
    }
    return [contours.get(biggestIndex), biggestApprox];
}