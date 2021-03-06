# -*- coding: utf-8 -*-
import json

from django.test import TestCase
from django.core.urlresolvers import reverse
from django.core.files.base import ContentFile
from django.conf import settings

from django.contrib.auth.models import User

from tasks.models import Hub, Task
import tasks


class ViewTests(TestCase):
    fixtures = ['test_data.json',]
    
    def test_hubs_get(self):
        response = self.client.get('/hubs/')
        json_list = json.loads(response.content)
        self.assertEqual(json_list[0]['title'], "Example Hub 2")
        self.assertEqual(len(json_list), 2)

    def test_hubs_get_by_id_not_archived(self):
        response = self.client.get('/hubs/?ids=2,3,4')
        json_list = json.loads(response.content)
        self.assertEqual(len(json_list), 3)

    def test_hubs_get_archived(self):
        response = self.client.get('/hubs/?archived=true')
        json_list = json.loads(response.content)
        self.assertEqual(json_list[0]['title'], "Example Hub 3")
        self.assertEqual(len(json_list), 1)

    def test_hubs_get_all(self):
        response = self.client.get('/hubs/?archived=all')
        json_list = json.loads(response.content)
        self.assertEqual(json_list[0]['title'], "Example Hub 3")
        self.assertEqual(len(json_list), 3)
    
    def test_hubs_get_by_id(self):
        response = self.client.get('/hubs/?ids=2')
        json_list = json.loads(response.content)
        self.assertEqual(json_list[0]['title'], "Example Hub")
    
    def test_hubs_get_by_id_nonexistent(self):
        response = self.client.get('/hubs/?ids=10')
        json_list = json.loads(response.content)
        self.assertEqual(len(json_list), 0)
    
    def test_hubs_post_loggedin(self):
        self.client.login(username='TestUser', password='12345')
    
        response = self.client.post(
            '/hubs/', 
            json.dumps({
                'title' : 'New Hub',
            }),
            content_type="application/json",
            )
        json_list = json.loads(response.content)
        self.assertEqual(set(json_list.keys()), set(['id', 'createdTime']))
        
        response = self.client.get('/hubs/')
        json_list = json.loads(response.content)
        self.assertEqual(len(json_list), 3)

        

    def test_hubs_post_admin_restrict(self):
        # TestUser is not an admin, this test should not create a hub
        self.client.login(username='TestUser', password='12345')
        
        # Change the USERS_CAN_CREATE_HUBS setting, to only allow admins to 
        # create hubs
        settings.USERS_CAN_CREATE_HUBS = False

        response = self.client.post(
            '/hubs/', 
            json.dumps({
                'title' : 'New Hub',
            }),
            content_type="application/json",
            )
        json_list = json.loads(response.content)
    
        self.assertEqual(response.status_code, 401)
        self.assertEqual(set(json_list.keys()), set(['status', 'error']))
        settings.USERS_CAN_CREATE_HUBS = True
    
    def test_hubs_post_loggedin_error(self):
        self.client.login(username='TestUser', password='12345')
    
        response = self.client.post(
            '/hubs/', 
            json.dumps({
                'wrong' : 'New Hub',
            }),
            content_type="application/json",
            )
        self.assertEqual(response.status_code, 500)
    
    def test_hubs_post_not_loggedin(self):
    
        response = self.client.post(
            '/hubs/', 
            json.dumps({
                'title' : 'New Hub',
            }),
            content_type="application/json",
            )
        
        self.assertEqual(response.status_code, 401)
        self.assertEqual(json.loads(response.content)['error'], 'Unauthorized')

    def test_hubs_post_image(self):
        self.client.login(username='TestUser', password='12345')
        f = open("%s/server/tasks/fixtures/Puppy.jpg" % settings.ROOT_PATH, 'rb')
        response = self.client.post(
            '/hubs/2/image/',
            {'image' : f,},
            )
            
        self.assertTrue('image' in json.loads(response.content))
    
    def test_hub_get(self):
        response = self.client.get('/hubs/2')
        json_data = json.loads(response.content)
        self.assertEqual(json_data['title'], 'Example Hub')
        self.assertEqual(json_data['owner'], '2')
    
    def test_hub_get_nonexistent(self):
        response = self.client.get('/hubs/100')
        self.assertEqual(response.status_code, 404)
    
    def test_hub_put(self):
        self.client.login(username='TestUser', password='12345')
        response = self.client.put(
                '/hubs/2', 
                data=json.dumps({'title' : 'Updated Title',}),
                content_type='application/json',
            )
        self.assertEqual(response.status_code, 200)

    def test_hubs_put_task_order(self):
        self.client.login(username='TestUser', password='12345')

        response = self.client.put(
            '/hubs/2', 
            data=json.dumps({
                'title' : 'New Hub',
                'tasks' : {
                    'order': ["1","2","3","7", "sym"]
                }
            }),
            content_type="application/json",
            )
        json_list = json.loads(response.content)
        self.assertEqual(json_list['tasks']['order'], ['2', '3', '7'])


    def test_hub_delete_with_not_new(self):
        self.client.login(username='TestUser', password='12345')
        response = self.client.delete('/hubs/2')
        hubs = Hub.objects.all()
        self.assertEqual(len(hubs), 3)
        self.assertEqual(response.status_code, 400)

    def test_hub_delete(self):
        self.client.login(username='TestUser', password='12345')
        for t in Task.objects.exclude(state=Task.STATE_NEW):
            t.delete()
        response = self.client.delete('/hubs/4')
        hubs = Hub.objects.all()
        self.assertEqual(len(hubs), 2)
    
    def test_hub_task_list(self):
        response = self.client.get('/hubs/2/tasks/')
        json_data = json.loads(response.content)
        self.assertEqual(len(json_data), 4)
    
    def test_task_get(self):
        response = self.client.get('/tasks/')
        json_data = json.loads(response.content)
        self.assertEqual(len(json_data), 7)
    
    def test_task_get_single(self):
        response = self.client.get('/tasks/3')
        json_data = json.loads(response.content)
        self.assertEqual(json_data['description'].startswith("This is"), True)
    
    def test_task_get_by_id(self):
        response = self.client.get('/tasks/?ids=4,5')
        json_data = json.loads(response.content)
        self.assertEqual(len(json_data), 2)

    def test_task_get_by_state(self):
        response = self.client.get('/tasks/?state=done')
        json_data = json.loads(response.content)
        self.assertEqual(len(json_data), 2)
    
    def test_task_create(self):
        self.client.login(username='TestUser', password='12345')
        hub = Hub.objects.get(pk=2)
        response = self.client.post(
            '/tasks/',
            json.dumps({
                "description" : "Lorem ipsum dolor sit amet, consectetur",
                "estimate" : 60*10,
                "hub" : hub.pk,
            }),
            content_type='application/json',
            )

        json_data = json.loads(response.content)
        self.assertEqual(json_data['description'].startswith("Lorem"), True)

    def test_task_create_without_estimate(self):
        self.client.login(username='TestUser', password='12345')
        hub = Hub.objects.get(pk=2)
        response = self.client.post(
            '/tasks/',
            json.dumps({
                "description" : "Lorem ipsum dolor sit amet, consectetur",
                "hub" : hub.pk,
            }),
            content_type='application/json',
            )

        json_data = json.loads(response.content)
        self.assertFalse('estimate' in json_data)

    def test_task_post_image(self):
        self.client.login(username='TestUser', password='12345')
        f = open("%s/server/tasks/fixtures/Puppy.jpg" % settings.ROOT_PATH, 'rb')
        response = self.client.post(
            '/tasks/3/image/',
            {'image' : f,},
            )
        self.assertTrue('image' in json.loads(response.content))



    def test_task_put(self):
        self.client.login(username='TestUser', password='12345')
        response = self.client.put(
                '/tasks/3',
                data=json.dumps({"description" : "New description!"}),
                content_type='application/json',
            )
        json_data = json.loads(response.content)
        self.assertEqual(json_data['description'].startswith("New"), True)
    
    
    def test_task_delete(self):
        self.client.login(username='TestUser', password='12345')
        old_tasks = len(Task.objects.all())
        response = self.client.delete('/tasks/6')
        tasks = len(Task.objects.all())
        self.assertEqual(old_tasks-1, tasks)

    def test_task_delete_not_new(self):
        self.client.login(username='TestUser', password='12345')
        old_tasks = len(Task.objects.all())
        response = self.client.delete('/tasks/2')
        tasks = len(Task.objects.all())
        self.assertEqual(old_tasks, tasks)
        self.assertEqual(response.status_code, 400)

    def test_user_get(self):
        response = self.client.get('/users/')
        json_data = json.loads(response.content)
        self.assertEqual(len(json_data), 4)

    def test_user_get_single(self):
        response = self.client.get('/users/2')
        json_data = json.loads(response.content)
        self.assertEqual(json_data['description'].startswith("This is"), True)
        self.assertFalse("email" in json_data)
        self.assertEqual(json_data['tasks']['owned']['archived'], ["8"])

    def test_user_get_single_has_email(self):
        self.client.login(username='TestUser', password='12345')
        response = self.client.get('/users/2')
        json_data = json.loads(response.content)
        self.assertEqual(json_data['description'].startswith("This is"), True)
        self.assertTrue("email" in json_data)

    def test_user_get_by_id(self):
        response = self.client.get('/users/?ids=2,3')
        json_data = json.loads(response.content)
        self.assertEqual(len(json_data), 2)

    
    def test_user_post(self):
        response = self.client.post(
                '/users/',
                data=json.dumps({
                    "description" : "New <b>description!</b>",
                    "username" : "test99",
                    "email" : "foo@example.com",
                    "password" : "12345",
                    "password_confirm" : "12345",
                    "name" : "Test User 99",
                    }),
                content_type='application/json',
            )
        json_data = json.loads(response.content)
        self.assertEqual(json_data['id'], 6)
        
        response = self.client.get('/users/6')
        json_data = json.loads(response.content)
        self.assertEqual(json_data['email'], 'foo@example.com')

    def test_user_post_bad_username(self):
        response = self.client.post(
                '/users/',
                data=json.dumps({
                    "description" : "New <b>description!</b>",
                    "username" : "test99@bad.com",
                    "email" : "foo@example.com",
                    "password" : "12345",
                    "password_confirm" : "12345",
                    "name" : "Test User 99",
                    }),
                content_type='application/json',
            )
        self.assertEqual(response.status_code, 400)
        json_data = json.loads(response.content)
        self.assertEqual(json_data['username'], ["This value may contain only letters, numbers and underscores."])
                

    def test_user_post_bad_password(self):
        response = self.client.post(
                '/users/',
                data=json.dumps({
                    "description" : "New <b>description!</b>",
                    "username" : "test99",
                    "email" : "foo@example.com",
                    "name" : "Test User 99",
                    }),
                content_type='application/json',
            )
        json_data = json.loads(response.content)
        self.assertTrue('password' in json_data)
        self.assertTrue('password_confirm' in json_data)
        

    def test_user_post_dupe(self):
        response = self.client.post(
                '/users/',
                data=json.dumps({
                    "description" : "New <b>description!</b>",
                    "username" : "test99",
                    "email" : "foo@example.com",
                    "password" : "12345",
                    "password_confirm" : "12345",
                    "name" : "Test User 99",
                    }),
                content_type='application/json',
            )
        response = self.client.post(
                '/users/',
                data=json.dumps({
                    "description" : "New <b>description!</b>",
                    "username" : "test99",
                    "email" : "foo@example.com",
                    "password" : "12345",
                    "name" : "Test User 99",
                    }),
                content_type='application/json',
            )
        json_data = json.loads(response.content)
        self.assertTrue(json_data['username'][0].startswith("A user with that username already exists."))


    def test_user_post_not_admin(self):
        response = self.client.post(
                '/users/',
                data=json.dumps({
                    "description" : "New <b>description!</b>",
                    "username" : "test99",
                    "email" : "foo@example.com",
                    "password" : "12345",
                    "password_confirm" : "12345",
                    "name" : "Test User 99",
                    "admin" : True,
                    }),
                content_type='application/json',
            )
        json_data = json.loads(response.content)
        self.assertEqual(json_data['id'], 6)
        
        response = self.client.get('/users/6')
        json_data = json.loads(response.content)
        self.assertFalse(json_data['admin'])

    def test_user_post_image(self):
        self.client.login(username='TestUser', password='12345')
        f = open("%s/server/tasks/fixtures/Puppy.jpg" % settings.ROOT_PATH, 'rb')
        response = self.client.post(
            '/users/2/image/',
            {'image' : f,},
            )
        self.assertTrue('image' in json.loads(response.content))

    def test_user_post_image_model_fields(self):
        self.client.login(username='TestUser', password='12345')
        f = open("%s/server/tasks/fixtures/Puppy.jpg" % settings.ROOT_PATH, 'rb')
        response = self.client.post(
            '/users/2/image/',
            {'image' : f,},
            )
        self.assertTrue('image' in json.loads(response.content))
        response = self.client.get('/users/2')
        json_data = json.loads(response.content)
        self.assertEqual(json_data['name'], "Test User 1")


    def test_user_post_image_wrong_user(self):
        self.client.login(username='TestUser', password='12345')
        f = open("%s/server/tasks/fixtures/Puppy.jpg" % settings.ROOT_PATH, 'rb')
        response = self.client.post(
            '/users/5/image/',
            {'image' : f,},
            )
        self.assertTrue('error' in json.loads(response.content))


    def test_user_put(self):
        self.client.login(username='TestUser', password='12345')
        response = self.client.put(
                '/users/2',
                data=json.dumps({"description" : "New <b>description!</b>"}),
                content_type='application/json',
            )
        json_data = json.loads(response.content)
        self.assertEqual(json_data['description'].startswith("New"), True)

    def test_user_put_wrong_user(self):
        self.client.login(username='TestUser', password='12345')
        response = self.client.put(
                '/users/3',
                data=json.dumps({"description" : "New <b>description!</b>"}),
                content_type='application/json',
            )
        self.assertEqual(response.status_code, 401)

    def test_user_put_update_email(self):
        self.client.login(username='TestUser', password='12345')
        response = self.client.put(
                '/users/2',
                data=json.dumps({"email" : "test_update@example.com"}),
                content_type='application/json',
            )
        json_data = json.loads(response.content)
        self.assertEqual(json_data['email'], "test_update@example.com")

        response = self.client.get('/users/2')
        json_data = json.loads(response.content)
        self.assertEqual(json_data['email'], "test_update@example.com")
        
    
    def test_user_change_password(self):
        self.client.login(username='TestUser', password='12345')
        response = self.client.put(
                '/users/2',
                data=json.dumps({"password" : "6789", "password_confirm" : "6789"}),
                content_type='application/json',
            )
        self.assertTrue(self.client.login(username='TestUser', password='6789'))
    
    def test_user_delete(self):
        self.client.login(username='TestUser', password='12345')
        response = self.client.delete('/users/3')

        self.assertEqual(response.status_code, 405)


    def test_statistics(self):
        response = self.client.get('/statistics/')
        json_data = json.loads(response.content)
        self.assertEqual(json_data['tasks']['new'], "1")
        self.assertEqual(json_data['tasks']['claimed'], "2")
        self.assertEqual(json_data['tasks']['done'], "2")
        self.assertEqual(json_data['tasks']['verified'], "2")
        self.assertEqual(json_data['hubs']['archived'], "1")
        self.assertEqual(json_data['tasks']['archived'], "1")

    def test_thumb(self):
        self.client.login(username='TestUser', password='12345')
        f = open("%s/server/tasks/fixtures/Puppy.jpg" % settings.ROOT_PATH, 'rb')
        response = self.client.post(
            '/users/2/image/',
            {'image' : f,},
            )

        response = self.client.get('/thumb/30x30/images/users/Puppy.jpg?crop')
        self.assertEqual(response.status_code, 200)

    def test_thumb_404(self):
        self.client.login(username='TestUser', password='12345')
        f = open("%s/server/tasks/fixtures/Puppy.jpg" % settings.ROOT_PATH, 'rb')
        response = self.client.post(
            '/users/2/image/',
            {'image' : f,},
            )

        response = self.client.get('/thumb/30x30/images/users/foo.jpg?crop')
        self.assertEqual(response.status_code, 404)
    
    def test_toggle_archived(self):
        self.client.login(username='TestUser3', password='12345')

        response = self.client.get('/hubs/?archived=true')
        json_list = json.loads(response.content)
        self.assertEqual(len(json_list), 1)
        
        response = self.client.put('/hubs/4',
            json.dumps({'archived' : False}),
            content_type="application/json",
            )
        self.assertFalse('archived' in json.loads(response.content))

        response = self.client.get('/hubs/?archived=true')
        json_list = json.loads(response.content)
        self.assertEqual(len(json_list), 0)



        response = self.client.put('/hubs/4', 
            json.dumps({'archived' : True}),
            content_type="application/json",
            )
        self.assertTrue('archived' in json.loads(response.content))
        
        
        
        
