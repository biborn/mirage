import { Component, OnInit, OnChanges, SimpleChange } from "@angular/core";
import { NgForm } from "@angular/common";
import { BuildComponent } from "./build/build.component";
import { ResultComponent } from "./result/result.component";
import { RunComponent } from "./run/run.component";
import { SaveQueryComponent } from './features/save/save.query.component';
import { ListQueryComponent } from './features/list/list.query.component';
import { Config } from "./shared/config";
import { EditorHook } from "./shared/editorHook";
import { AppbaseService } from "./shared/appbase.service";
import { UrlShare } from "./shared/urlShare";

@Component({
	selector: 'my-app',
	templateUrl: './app/app.component.html',
	directives: [BuildComponent, ResultComponent, RunComponent, SaveQueryComponent, ListQueryComponent],
	providers: [AppbaseService]
})

export class AppComponent implements OnInit, OnChanges {

	constructor(public appbaseService: AppbaseService) {}

	public connected: boolean = false;
	public initial_connect: boolean = false;
	public mapping: any;
	public types: any;
	public selectedTypes: any;
	public result: any;
	public detectChange: string = null;
	public config: Config = {
		url: "",
		appname: "",
		username: "",
		password: "",
		host: ""
	};
	public savedQueryList: any = [];
	public query_info = {
		name: '',
		tag: ''
	};
	public sort_by: string = 'createdAt';
	public sort_direction: boolean = true;
	public searchTerm: string = '';
	public filteredQuery: any;
	public finalUrl: string;
	public sidebar: boolean = false;
	public editorHookHelp = new EditorHook({ editorId: 'editor' });
	public responseHookHelp = new EditorHook({ editorId: 'responseBlock' });
	public urlShare = new UrlShare();

	ngOnInit() {
		this.setInitialValue();
		// get data from url
		this.urlShare.decryptUrl();
		if (this.urlShare.decryptedData.config) {
			var config = this.urlShare.decryptedData.config;
			this.setLocalConfig(config.url, config.appname);
		}

		this.getLocalConfig();
		try {
			let list = window.localStorage.getItem('queryList');
			if (list) {
				this.savedQueryList = JSON.parse(list);
				this.sort(this.sort_by, this.savedQueryList);
			}
		} catch (e) {}
	}

	ngOnChanges(changes) {
		var prev = changes['selectedQuery'].previousValue;
		var current = changes['selectedQuery'].currentValue;
	}

	//Get config from localstorage 
	getLocalConfig() {
		var url = window.localStorage.getItem('url');
		var appname = window.localStorage.getItem('appname');
		if (url != null) {
			this.config.url = url;
			this.config.appname = appname;
			this.connect(false);
		} else {
			this.initial_connect = true;
		}
	}

	//Set config from localstorage
	setLocalConfig(url, appname) {
		window.localStorage.setItem('url', url);
		window.localStorage.setItem('appname', appname);
	}

	setInitialValue() {
		this.mapping =  null;
		this.types = [];
		this.selectedTypes = [];
		this.result = {
			resultQuery: {
				'type': '',
				'result': [],
				'final': "{}"
			},
			output: {},
			queryId: 1
		};
	}

	// Connect with config url and appname
	// do mapping request  
	// and set response in mapping property 
	connect(clearFlag) {
		this.connected = false;
		this.initial_connect = false;
		var APPNAME = this.config.appname;
		var URL = this.config.url;
		var urlsplit = URL.split(':');
		var pwsplit = urlsplit[2].split('@');
		this.config.username = urlsplit[1].replace('//', '');
		this.config.password = pwsplit[0];
		this.config.host = urlsplit[0] + '://' + pwsplit[1];
		var self = this;
		this.appbaseService.setAppbase(this.config);
		this.appbaseService.get('/_mapping').then(function(res) {
			self.connected = true;
			let data = res.json();
			self.setInitialValue();
			self.finalUrl = self.config.host + '/' + self.config.appname;
			self.mapping = data;
			self.types = self.seprateType(data);
			self.setLocalConfig(self.config.url, self.config.appname);
			self.detectChange += "done";
			self.editorHookHelp.setValue('');

			if (!clearFlag) {
				var decryptedData = self.urlShare.decryptedData;
				if (decryptedData.mapping) {
					self.mapping = decryptedData.mapping;
				}
				if(decryptedData.types) {
					self.types = decryptedData.types;
				}
				if(decryptedData.selectedTypes) {
					self.selectedTypes = decryptedData.selectedTypes;
					self.detectChange = "check";
					setTimeout(() => { $('#setType').val(self.selectedTypes).trigger("change"); }, 300)
				}
				if(decryptedData.result) {
					self.result = decryptedData.result;
				}
				if(decryptedData.finalUrl) {
					self.finalUrl = decryptedData.finalUrl;
				}
			}

			//set input state
			self.urlShare.inputs['config'] = self.config;
			self.urlShare.inputs['types'] = self.types;
			self.urlShare.inputs['mapping'] = self.mapping;
			self.urlShare.inputs['selectedTypes'] = self.selectedTypes;
			self.urlShare.inputs['result'] = self.result;
			self.urlShare.inputs['finalUrl'] = self.finalUrl;
			self.urlShare.createUrl();
		}).catch(function(e) {
			self.initial_connect = true;
			alert(e.json().message);
		});
	}

	// Seprate the types from mapping	
	seprateType(mappingObj: any) {
		var mapObj = mappingObj[this.config.appname].mappings;
		var types = [];
		for (var type in mapObj) {
			types.push(type);
		}
		return types;
	}

	newQuery(query) {
		this.config = query.config;
		this.mapping = query.mapping;
		this.selectedTypes = query.selectedTypes;
		this.types = query.types;
		this.result = query.result;
		this.query_info.name = query.name;
		this.query_info.tag = query.tag;
		this.detectChange = "check";
		setTimeout(() => { $('#setType').val(this.selectedTypes).trigger("change"); }, 300)
	}

	deleteQuery(index) {
		var confirmFlag = confirm("Do you want to delete this query?");
		if (confirmFlag) {
			this.savedQueryList.splice(index, 1);
			try {
				window.localStorage.setItem('queryList', JSON.stringify(this.savedQueryList));
			} catch (e) {}
		}
	}

	clearAll() {
		this.setInitialValue();
		this.query_info = {
			name: '',
			tag: ''
		};
		this.detectChange += "check";
		this.editorHookHelp.setValue('');
	}

	sidebarToggle() {
		this.sidebar = this.sidebar ? false : true;
	}

	saveQuery(list) {
		this.savedQueryList = list;
		var direction = this.sort_direction ? false : true;
		this.sort(this.sort_by, this.filteredQuery, direction);
		var queryString = JSON.stringify(this.savedQueryList);
		try {
			window.localStorage.setItem('queryList', JSON.stringify(this.savedQueryList));
		} catch (e) {}
		$('#saveQueryModal').modal('hide');
	}

	// Sorting
	sort(prop: string, list: any, direction: boolean) {
		if (this.searchTerm.trim().length < 1) {
			var list = list ? list : this.savedQueryList;
		} else {
			var list = list ? list : this.filteredQuery;
		}
		if (!direction) {
			if (prop == this.sort_by) {
				this.sort_direction = this.sort_direction ? false : true;
			} else {
				this.sort_direction = true;
			}
		}
		this.sort_by = prop;
		if (this.sort_direction) {
			this.filteredQuery = list.sortBy(function(item) {
				return item[prop];
			});
		} else {
			this.filteredQuery = list.sortBy(function(item) {
				return -item[prop];
			});
		}
		console.log(this.sort_direction, this.sort_by);
		console.log('filtered', this.filteredQuery);
	}

	// Searching
	searchList($event) {
		this.searchTerm = $event.target.value;
		if (this.searchTerm.trim().length > 1) {
			this.filteredQuery = this.savedQueryList.filter(function(item) {
				return item.tag.indexOf(this.searchTerm) !== -1 ? true : false;
			}.bind(this));

			if (!this.filteredQuery.length) {
				this.filteredQuery = this.savedQueryList.filter(function(item) {
					return item.name.indexOf(this.searchTerm) !== -1 ? true : false;
				}.bind(this));
			}
		} else {
			this.filteredQuery = this.savedQueryList;
		}
		var direction = this.sort_direction ? false : true;
		this.sort(this.sort_by, this.filteredQuery, direction);
	}

	setFinalUrl(url: string) {
		this.finalUrl = url;

		//set input state
		this.urlShare.inputs['finalUrl'] = this.finalUrl;
		this.urlShare.createUrl();
	}

}
