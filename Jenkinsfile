pipeline {
  agent any

  environment {
    COMPOSE_FILE = 'docker-compose.yml'
    YTDLP_COOKIES_CRED = 'ytdlp_cookies'
  }

  options {
    timestamps()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Images') {
      steps {
        withCredentials([file(credentialsId: "${YTDLP_COOKIES_CRED}", variable: 'YTDLP_COOKIES_FILE')]) {
          sh 'mkdir -p cookies'
          sh 'cp "$YTDLP_COOKIES_FILE" cookies/ytdlp_cookies.txt'
        }
        sh 'docker compose -f $COMPOSE_FILE build'
      }
    }

    stage('Deploy') {
      steps {
        sh 'docker compose -f $COMPOSE_FILE up -d'
      }
    }
  }

  post {
    always {
      sh 'docker compose -f $COMPOSE_FILE ps'
    }
  }
}
