let scene, camera, renderer, snake, food, score, gameOver, autoPlay;
let snakeDirection, snakeSegments, foodPosition, autoPlayInterval;

const boardSize = 20;
const segmentSize = 1;
const initialSnakeLength = 3;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camera.position.z = 30;

    snakeDirection = new THREE.Vector3(1, 0, 0);
    snakeSegments = [];
    score = 0;
    gameOver = false;
    autoPlay = false;

    createBoard();
    createSnake();
    createFood();
    addLighting();

    document.addEventListener('keydown', onKeyDown);
    animate();
}

function createBoard() {
    const boardGeometry = new THREE.PlaneGeometry(boardSize, boardSize);
    const boardMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.rotation.x = -Math.PI / 2;
    scene.add(board);
}

function createSnake() {
    for (let i = 0; i < initialSnakeLength; i++) {
        const segment = createSegment();
        segment.position.set(i * segmentSize, 0, 0);
        snakeSegments.push(segment);
        scene.add(segment);
    }
}

function createSegment() {
    const segmentGeometry = new THREE.BoxGeometry(segmentSize, segmentSize, segmentSize);
    const segmentMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    return new THREE.Mesh(segmentGeometry, segmentMaterial);
}

function createFood() {
    const foodGeometry = new THREE.SphereGeometry(segmentSize / 2, 32, 32);
    const foodMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    food = new THREE.Mesh(foodGeometry, foodMaterial);
    scene.add(food);
    spawnFood();
}

function spawnFood() {
    const x = Math.floor(Math.random() * boardSize - boardSize / 2);
    const z = Math.floor(Math.random() * boardSize - boardSize / 2);
    food.position.set(x, 0.5, z);
    foodPosition = new THREE.Vector3(x, 0.5, z);
}

function addLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(10, 20, 10);
    scene.add(pointLight);
}

function onKeyDown(event) {
    switch (event.key) {
        case 'ArrowUp':
            if (snakeDirection.z === 0) snakeDirection.set(0, 0, -1);
            break;
        case 'ArrowDown':
            if (snakeDirection.z === 0) snakeDirection.set(0, 0, 1);
            break;
        case 'ArrowLeft':
            if (snakeDirection.x === 0) snakeDirection.set(-1, 0, 0);
            break;
        case 'ArrowRight':
            if (snakeDirection.x === 0) snakeDirection.set(1, 0, 0);
            break;
        case 'p':
            autoPlay = !autoPlay;
            updateAutoPlayStatus();
            if (autoPlay) {
                autoPlayInterval = setInterval(autoPlayMove, 100);
            } else {
                clearInterval(autoPlayInterval);
            }
            break;
    }
}

function animate() {
    if (!gameOver) {
        requestAnimationFrame(animate);
        moveSnake();
        renderer.render(scene, camera);
    }
}

function moveSnake() {
    const newHeadPosition = snakeSegments[0].position.clone().add(snakeDirection);

    if (checkCollision(newHeadPosition)) {
        endGame();
        return;
    }

    const newHead = createSegment();
    newHead.position.copy(newHeadPosition);
    scene.add(newHead);
    snakeSegments.unshift(newHead);

    if (newHead.position.equals(foodPosition)) {
        score++;
        document.getElementById('score-display').innerText = `Score: ${score}`;
        spawnFood();
    } else {
        const tail = snakeSegments.pop();
        scene.remove(tail);
    }
}

function checkCollision(position) {
    if (Math.abs(position.x) > boardSize / 2 || Math.abs(position.z) > boardSize / 2) {
        return true;
    }

    for (let i = 1; i < snakeSegments.length; i++) {
        if (position.equals(snakeSegments[i].position)) {
            return true;
        }
    }

    return false;
}

function endGame() {
    gameOver = true;
    document.getElementById('game-over-screen').style.display = 'block';
}

function autoPlayMove() {
    const openSet = [];
    const closedSet = [];
    const startNode = {
        position: snakeSegments[0].position.clone(),
        g: 0,
        h: snakeSegments[0].position.distanceTo(foodPosition),
        f: 0,
        parent: null
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    while (openSet.length > 0) {
        let currentNode = openSet.reduce((a, b) => (a.f < b.f ? a : b));
        if (currentNode.position.equals(foodPosition)) {
            let path = [];
            while (currentNode.parent) {
                path.push(currentNode.position.clone().sub(currentNode.parent.position));
                currentNode = currentNode.parent;
            }
            snakeDirection.copy(path.pop());
            return;
        }

        openSet.splice(openSet.indexOf(currentNode), 1);
        closedSet.push(currentNode);

        const neighbors = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1)
        ];

        neighbors.forEach(direction => {
            const neighborPosition = currentNode.position.clone().add(direction);
            if (checkCollision(neighborPosition) || closedSet.some(node => node.position.equals(neighborPosition))) {
                return;
            }

            const g = currentNode.g + 1;
            const h = neighborPosition.distanceTo(foodPosition);
            const f = g + h;
            const existingNode = openSet.find(node => node.position.equals(neighborPosition));

            if (existingNode) {
                if (g < existingNode.g) {
                    existingNode.g = g;
                    existingNode.f = f;
                    existingNode.parent = currentNode;
                }
            } else {
                openSet.push({
                    position: neighborPosition,
                    g,
                    h,
                    f,
                    parent: currentNode
                });
            }
        });
    }
}

function updateAutoPlayStatus() {
    const statusElement = document.getElementById('auto-play-status');
    statusElement.innerText = `Auto-Play Mode: ${autoPlay ? 'ON' : 'OFF'}`;
}

init();
