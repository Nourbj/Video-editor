pipeline {
  agent any

  environment {
    COMPOSE_FILE = 'docker-compose.yml'
  }

  options {
    timestamps()
    skipDefaultCheckout(true)
  }

  stages {
    stage('Checkout') {
      steps {
        sh 'docker run --rm -v "$WORKSPACE":/work alpine sh -c "rm -rf /work/uploads /work/outputs /work/temp /work/cookies" || true'
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
      sh '[ -f $COMPOSE_FILE ] && docker compose -f $COMPOSE_FILE ps || true'
    }
  }
}
