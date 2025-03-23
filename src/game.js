// Fruit class
class Fruit {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 30;
    this.velocityX = (Math.random() - 0.5) * 2; // Reduced horizontal movement from 4 to 2
    this.velocityY = -10 - Math.random() * 2; // Reduced initial upward velocity from -15 to -10
    this.rotation = 0;
    this.rotationSpeed = (Math.random() - 0.5) * 0.1; // Reduced rotation speed
    this.sliced = false;
    this.sliceAngle = 0;
    this.half1Rotation = 0;
    this.half2Rotation = 0;
    this.half1VelocityX = 0;
    this.half2VelocityX = 0;
    this.half1VelocityY = 0;
    this.half2VelocityY = 0;
    this.image = new Image();
    // Randomly select one of the cyber fruits
    const fruits = ['cyberapple', 'cyberbanana', 'cyberorange', 'cyberwatermelon'];
    const randomFruit = fruits[Math.floor(Math.random() * fruits.length)];
    this.image.src = `assets/fruits/${randomFruit}.svg`;
    console.log('New fruit created at:', x, y);
  }

  update() {
    if (!this.sliced) {
      this.x += this.velocityX;
      this.y += this.velocityY;
      this.velocityY += 0.2; // Reduced gravity from 0.3 to 0.2
      this.rotation += this.rotationSpeed;
    } else {
      // Update sliced halves
      this.half1Rotation += 0.1;
      this.half2Rotation -= 0.1;
      
      this.half1VelocityX += 0.1;
      this.half2VelocityX -= 0.1;
      this.half1VelocityY += 0.3;
      this.half2VelocityY += 0.3;
      
      this.x += this.half1VelocityX;
      this.y += this.half1VelocityY;
    }
  }

  draw(ctx) {
    ctx.save();
    
    if (!this.sliced) {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.drawImage(this.image, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
    } else {
      // Draw first half
      ctx.save();
      ctx.translate(this.x - this.radius/2, this.y);
      ctx.rotate(this.half1Rotation);
      ctx.scale(0.5, 1);
      ctx.drawImage(this.image, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
      ctx.restore();

      // Draw second half
      ctx.save();
      ctx.translate(this.x + this.radius/2, this.y);
      ctx.rotate(this.half2Rotation);
      ctx.scale(0.5, 1);
      ctx.drawImage(this.image, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
      ctx.restore();
    }
    
    ctx.restore();
  }
}

// Bomb class
class Bomb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 30;
    this.velocityX = (Math.random() - 0.5) * 4;
    this.velocityY = -15 - Math.random() * 3;
    this.rotation = 0;
    this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    this.sliced = false;
    this.explosionRadius = 0;
    this.explosionMaxRadius = 60;
    this.explosionSpeed = 5;
    this.explosionOpacity = 1;
    this.image = new Image();
    this.image.src = 'assets/fruits/cyberbomb.svg';
    console.log('New bomb created at:', x, y);
  }

  update() {
    if (!this.sliced) {
      this.x += this.velocityX;
      this.y += this.velocityY;
      this.velocityY += 0.3;
      this.rotation += this.rotationSpeed;
    } else {
      // Update explosion animation
      this.explosionRadius += this.explosionSpeed;
      this.explosionOpacity = 1 - (this.explosionRadius / this.explosionMaxRadius);
    }
  }

  draw(ctx) {
    ctx.save();
    if (!this.sliced) {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.drawImage(this.image, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
    } else {
      // Draw explosion
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.explosionRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 0, 0, ${this.explosionOpacity})`;
      ctx.fill();
      
      // Draw inner explosion
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.explosionRadius * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 165, 0, ${this.explosionOpacity})`;
      ctx.fill();
      
      // Draw core explosion
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.explosionRadius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 0, ${this.explosionOpacity})`;
      ctx.fill();
    }
    ctx.restore();
  }
}

// Game class
export class Game {
  constructor(canvas, ctx) {
    console.log('Creating new game instance');
    this.canvas = canvas;
    this.ctx = ctx;
    this.fruits = [];
    this.bombs = [];
    this.slicePoints = [];
    this.lastTime = 0;
    this.fruitSpawnTimer = 0;
    this.isGameRunning = false;
    this.lives = 3;
    this.score = 0;

    // Load custom font
    const fontFace = new FontFace('PPNeueBit', 'url(/fonts/ppneuebit-bold.otf)');
    fontFace.load().then(font => {
      document.fonts.add(font);
      console.log('Custom font loaded successfully');
    }).catch(error => {
      console.error('Error loading custom font:', error);
    });

    // Load background image
    this.backgroundImage = new Image();
    this.backgroundImage.src = 'assets/bg/bg.jpeg';

    // Mouse/touch events
    this.canvas.addEventListener('mousedown', (e) => this.startSlice(e));
    this.canvas.addEventListener('mousemove', (e) => this.moveSlice(e));
    this.canvas.addEventListener('mouseup', () => this.endSlice());
    this.canvas.addEventListener('touchstart', (e) => this.startSlice(e.touches[0]));
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.moveSlice(e.touches[0]);
    });
    this.canvas.addEventListener('touchend', () => this.endSlice());
  }

  start() {
    console.log('Starting game');
    this.fruits = [];
    this.bombs = [];
    this.slicePoints = [];
    this.isGameRunning = true;
    this.lastTime = performance.now();
    this.fruitSpawnTimer = 0;
    this.lives = 3;
    this.score = 0;
  }

  spawnFruit() {
    const x = Math.random() * this.canvas.width;
    const y = this.canvas.height + 30;
    // 20% chance to spawn a bomb instead of a fruit
    if (Math.random() < 0.2) {
      this.bombs.push(new Bomb(x, y));
      console.log('Bomb spawned. Total bombs:', this.bombs.length);
    } else {
      this.fruits.push(new Fruit(x, y));
      console.log('Fruit spawned. Total fruits:', this.fruits.length);
    }
  }

  startSlice(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    this.slicePoints = [{x, y}];
  }

  moveSlice(e) {
    if (this.slicePoints.length === 0) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    this.slicePoints.push({x, y});

    // Keep only last 10 points for trail effect
    if (this.slicePoints.length > 10) {
      this.slicePoints.shift();
    }
  }

  endSlice() {
    this.slicePoints = [];
  }

  checkCollisions() {
    if (this.slicePoints.length < 2) return { slicedFruits: 0, hitBomb: false };

    let slicedCount = 0;
    let hitBomb = false;

    // Check fruit collisions
    this.fruits.forEach(fruit => {
      if (fruit.sliced) return;

      for (let i = 1; i < this.slicePoints.length; i++) {
        const p1 = this.slicePoints[i - 1];
        const p2 = this.slicePoints[i];
        
        const dx = fruit.x - p1.x;
        const dy = fruit.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < fruit.radius) {
          fruit.sliced = true;
          const sliceAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          fruit.sliceAngle = sliceAngle;
          fruit.half1VelocityX = fruit.velocityX + Math.cos(sliceAngle) * 2;
          fruit.half2VelocityX = fruit.velocityX - Math.cos(sliceAngle) * 2;
          fruit.half1VelocityY = fruit.velocityY;
          fruit.half2VelocityY = fruit.velocityY;
          slicedCount++;
          break;
        }
      }
    });

    // Check bomb collisions
    this.bombs.forEach(bomb => {
      if (bomb.sliced) return;

      for (let i = 1; i < this.slicePoints.length; i++) {
        const p1 = this.slicePoints[i - 1];
        const p2 = this.slicePoints[i];
        
        const dx = bomb.x - p1.x;
        const dy = bomb.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < bomb.radius) {
          bomb.sliced = true;
          hitBomb = true;
          break;
        }
      }
    });

    return { slicedFruits: slicedCount, hitBomb };
  }

  update(currentTime) {
    // Clear canvas and draw background - do this regardless of game state
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);

    if (!this.isGameRunning) return;

    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.fruitSpawnTimer += deltaTime;
    if (this.fruitSpawnTimer > 1.5) {
      this.spawnFruit();
      this.fruitSpawnTimer = 0;
    }

    // Update and draw fruits
    this.fruits = this.fruits.filter(fruit => {
      fruit.update();
      fruit.draw(this.ctx);

      if (fruit.y > this.canvas.height + 50) {
        // Remove missed fruits without affecting lives
        return false;
      }
      return true;
    });

    // Update and draw bombs
    this.bombs = this.bombs.filter(bomb => {
      bomb.update();
      bomb.draw(this.ctx);

      if (bomb.y > this.canvas.height + 50 || bomb.sliced) {
        return false;
      }
      return true;
    });

    // Draw slice trail
    if (this.slicePoints.length >= 2) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.slicePoints[0].x, this.slicePoints[0].y);
      for (let i = 1; i < this.slicePoints.length; i++) {
        this.ctx.lineTo(this.slicePoints[i].x, this.slicePoints[i].y);
      }
      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    }

    // Check collisions and update score
    const { slicedFruits, hitBomb } = this.checkCollisions();
    this.score += slicedFruits * 10;

    // Check game-ending conditions - only when a bomb is sliced
    if (hitBomb) {
      this.lives--;
      if (this.lives <= 0) {
        this.stop();
      }
    }

    return {
      gameOver: this.lives <= 0,
      slicedFruits,
      hitBomb,
      lives: this.lives,
      score: this.score
    };
  }

  stop() {
    console.log('Stopping game');
    this.isGameRunning = false;
  }
} 