#!/usr/bin/env python3
"""
Seed Test FCM Tokens - A utility to add test tokens to your database for testing notifications
"""
import os
import sys
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# Add parent directory to path for imports
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(script_dir))

# Get Firebase credentials path from environment variable or use default
FIREBASE_CREDENTIALS_PATH = os.environ.get('FIREBASE_SERVICE_ACCOUNT', os.path.join(
    os.path.dirname(os.path.dirname(script_dir)),  # Go up to project root
    'config', 
    'firebase-credentials.json'
))

def initialize_firebase():
    """Initialize Firebase connection"""
    try:
        if not os.path.exists(FIREBASE_CREDENTIALS_PATH):
            print(f"Firebase credentials file not found at {FIREBASE_CREDENTIALS_PATH}")
            
            # Check for common CI paths when running in GitHub Actions
            ci_paths = [
                './firebase_service_account.json',  # Root level in GitHub Actions
                '../firebase_service_account.json',  # One level up
                '../../firebase_service_account.json',  # Two levels up
            ]
            
            found_path = None
            for path in ci_paths:
                if os.path.exists(path):
                    found_path = path
                    break
                    
            if found_path:
                print(f"Found Firebase credentials at alternate path: {found_path}")
                cred = credentials.Certificate(found_path)
            else:
                print("Could not locate Firebase credentials file")
                return None
        else:
            # Use the original path
            cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
            
        if not firebase_admin._apps:  # Check if already initialized
            firebase_admin.initialize_app(cred)
        
        # Get Firestore client
        db = firestore.client()
        print("Firebase connection established successfully")
        return db
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        return None

def seed_test_tokens(db, num_tokens=3):
    """Seed test FCM tokens in the database"""
    try:
        # Create test user if it doesn't exist
        user_id = "test_user_for_notifications"
        user_ref = db.collection('users').document(user_id)
        user_data = user_ref.get()
        
        if not user_data.exists:
            user_ref.set({
                'email': 'testuser@example.com',
                'name': 'Test User',
                'createdAt': firestore.SERVER_TIMESTAMP,
                'notificationEnabled': True
            })
            print(f"Created test user with ID: {user_id}")
        
        # Create test tokens
        tokens_created = 0
        for i in range(num_tokens):
            # Generate a dummy token
            token_id = f"test_token_{i}_{int(datetime.now().timestamp())}"
            
            # Store in fcm_tokens collection
            token_ref = db.collection('fcm_tokens').document(token_id)
            token_ref.set({
                'token': token_id,
                'userId': user_id,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'lastValidated': firestore.SERVER_TIMESTAMP,
                'isValid': True,
                'platform': 'web',
                'browser': 'Test Browser',
                'isMobile': False,
                'subscribedTopics': ['daily_weather_insights']
            })
            
            tokens_created += 1
        
        # Update the user with the latest test token
        user_ref.update({
            'fcmToken': token_id,
            'fcmTokenUpdatedAt': firestore.SERVER_TIMESTAMP
        })
        
        print(f"Successfully created {tokens_created} test tokens")
        print(f"You can now test notifications using the daily_weather_insights.py script")
        
        return True
    except Exception as e:
        print(f"Error seeding test tokens: {e}")
        return False

def main():
    """Main function"""
    db = initialize_firebase()
    if not db:
        print("Failed to initialize Firebase")
        return 1
    
    success = seed_test_tokens(db)
    if not success:
        print("Failed to seed test tokens")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
