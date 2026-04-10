pipeline {
  agent any

  environment {
    COMPOSE_FILE = 'docker-compose.yml'
    COMPOSE_PROJECT_NAME = 'video-editor'
  }

  options {
    timestamps()
  }

  stages {
    stage('Verify Cookies File') {
      steps {
        sh 'ls -la cookies || true'
        sh 'test -f cookies/ytdlp_cookies.txt && echo "OK: cookies file exists" || (echo "MISSING: cookies/ytdlp_cookies.txt" && exit 1)'
      }
    }

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Images') {
      steps {
        sh 'docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE build --no-cache --pull'
      }
    }

    stage('Deploy') {
      steps {
        sh 'docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE down'
        sh 'docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE up -d --force-recreate --remove-orphans'
      }
    }

    stage('Verify Cookies In Container') {
      steps {
        sh 'docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE exec -T backend ls -la /app/cookies'
        sh 'docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE exec -T backend head -n 1 /app/cookies/ytdlp_cookies.txt'
        sh 'docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE exec -T backend sh -lc "head -n 5 /app/cookies/ytdlp_cookies.txt"'
        sh 'docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE exec -T backend sh -lc "stat -c \'mtime=%y size=%s bytes\' /app/cookies/ytdlp_cookies.txt"'
      }
    }

    stage('Test yt-dlp in Container') {
      steps {
        sh 'docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE exec -T backend sh -lc "which node || true"'
        sh 'docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE exec -T backend sh -lc "node -v || true"'
        sh 'docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE exec -T backend yt-dlp --cookies /app/cookies/ytdlp_cookies.txt -v "https://www.youtube.com/watch?v=gR4KxDPcFMI" || true'
      }
    }
  }

  post {
    always {
      sh 'docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE ps'
    }
  }
}
