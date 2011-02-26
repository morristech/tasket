import datetime
import time
import json

from django.db import models
# from django.contrib.gis.db import models as geo_models
from django.core.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic
from django.contrib.auth.models import User

from django.conf import settings

import managers

class Task(models.Model):
    """
    A task's JSON object should look like this:
    
        {
            "id": "task_id",          *required (assigned by server on creation)
            "description": null,
            "image": null,
            "estimate": null,
            "state": "new",
            "owner": "user_id",       *required
            "claimedBy": "user_id",
            "verifiedBy": "user_id",
            "createdTime": 1298567873
            "hub": "hub_id",          *required
        }
        
    """
    
    TIME_ESTIMATE = (
        (60*10, 'Ten Minutes'),
        (60*30, 'Half an Hour'),
        (60*60, 'One Hour'),
        (60*60*2, 'Two hours'),
        (60*60*4, 'Four hours'),
        (60*60*8, 'Eight hours'),
        (60*60*12, 'More than Eight hours'),
    )
    
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to="images", blank=True, null=True)
    estimate = models.IntegerField(blank=True, null=True, choices=TIME_ESTIMATE)
    state = models.CharField(blank=True, max_length=100)
    owner = models.ForeignKey(User, related_name='owner')
    claimedBy = models.ForeignKey(User, related_name='claimedBy', null=True)
    verifiedBy = models.ForeignKey(User, related_name='verifiedBy', null=True)
    createdTime = models.DateTimeField(blank=True, default=datetime.datetime.now)
    hub = models.ForeignKey('Hub')

    objects = managers.TaskManager()

    def __unicode__(self):
        return self.description[:10]

    def created_timestamp(self):
        return time.mktime(self.createdTime.timetuple())
    

    def as_dict(self):
        """
        Custom method for returning specifically formatted JSON.

        Handy for outputting related objects as a list, etc.
        
        """
        obj_dict = {
            "id": self.pk,
            "description": self.description,
            "estimate": self.estimate,
            "state" : self.state,
            "owner" : self.owner.pk,
            "claimedBy" : None,
            "verifiedBy" : None,
            "createdTime" : self.created_timestamp(),
            "hub" : self.hub.as_dict(),
        }
        
        if self.image:
            obj_dict["image"] = self.image.url
        if self.claimedBy:
            obj_dict["claimedBy"] = self.claimedBy.pk
        if self.verifiedBy:
            obj_dict["verifiedBy"] = self.verifiedBy.pk
        
        return obj_dict

    def foo():
        return "foo"

    def as_json(self):
        """
        Dumps the objects as_dict method in to JSON.
        """
        return json.dumps(self.as_dict())


class Hub(models.Model):
    """
    Stores collections of tasks.  A 'hub' JSON object should look like this:
    
        {
        "id": "hub_id",         *required (assigned by server on creation)
        "title": null,          *required
        "description": null,
        "image": null,
        "owner": "user_id"      *required
        "tasks": [/* unverified task ids */]
        "createdTime": 1298567873
        }
    """
    
    title = models.CharField(blank=False, max_length=255)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='images', null=True, blank=True)
    owner = models.ForeignKey(User)
    createdTime = models.DateTimeField(blank=True, default=datetime.datetime.now)
    
    objects = managers.HubManager()
    
    def __unicode__(self):
        return u"%s" % self.title

    class Meta:
        ordering = ('-id',)

    def created_timestamp(self):
        return time.mktime(self.createdTime.timetuple())

    def as_dict(self):
        """
        Custom method for returning specifically formatted JSON.
    
        Handy for outputting related objects as a list, etc.
        """
        obj_dict = {
            "id": self.pk,
            "title": self.title,
            "description": self.description,
            "owner": self.owner.pk,
            "tasks": [t.pk for t in self.task_set.all()],
            "createdTime": self.created_timestamp(),
        }
        
        if self.image:
            obj_dict["image"] = self.image.url
        
        return obj_dict

    def as_json(self):
        """
        Dumps the objects as_dict method in to JSON.
        """
        return json.dumps(self.as_dict())





