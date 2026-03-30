pipeline {
  agent any

  environment {
    // Adjust if your compose file or project name differs
    COMPOSE_FILE = 'docker-compose.yml'
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
