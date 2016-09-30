import { Injectable } from '@angular/core'
import { Headers, Http } from '@angular/http'
import 'rxjs/add/operator/toPromise'

import { UserLogin } from '../models/user-login.model'
import { Pokemon } from '../models/pokemon.model'
import { Species } from '../models/species.model'
import { Move } from '../models/move.model'

import { PropertiesService } from './properties.service'


@Injectable()
export class PokemonService {
	private _pokemon : Pokemon[] = [];
	private _species: Species[] = [];
	private _userLogin: UserLogin = null;

	constructor(
		private _http: Http,
		private _properties: PropertiesService
	) {}

	public get pokemon(): Pokemon[]{
		return this._pokemon
	}

	public get species(): Species[]{
		return this._species
	}

	public get userLogin(): UserLogin {
		return this._userLogin;
	}

	public set userLogin(userLogin: UserLogin){
		this._userLogin = userLogin;
	}

	public retrievePokemon () {
		let headers = new Headers({
			'Content-Type': 'application/json'});
		return this._http
		.post(
			this._properties.apiHost + this._properties.getPokemonRoute, 
			JSON.stringify(this._userLogin), 
			{headers: headers}
		)
		.toPromise()
		.then(res => {
			let resBody = res.json();
			this._pokemon = resBody.pokemon as Pokemon[];
			this._pokemon = this._pokemon.map(function (pokemon) {
  			let fast_dps = {
    			avg: 0,
    			gym: 0
  			};
  			let fast_tt = 0;
  			let fast_gym_tt = 0;
  			let charge_gym_tt = 0;
  			let charge_dps = {
    			avg: 0,
    			gym: 0
  			};
  			let charge_tt = 0;
				let types: any = window['types_lookup'];

				pokemon.type_1 = window['pokemon'][pokemon.pokedex_number].Type1.toLowerCase();
				pokemon.type_2 = window['pokemon'][pokemon.pokedex_number].Type2.toLowerCase();

        pokemon.attack_adjust = (pokemon.attack_iv + window['pokemon'][pokemon.pokedex_number].BaseAttack) / window['pokemon'][pokemon.pokedex_number].BaseAttack;

        pokemon.stamina_adjust = (pokemon.stamina_iv + window['pokemon'][pokemon.pokedex_number].BaseStamina) / window['pokemon'][pokemon.pokedex_number].BaseStamina;

				pokemon.moves = {
					fast: window['pokemon'][pokemon.pokedex_number].QuickMoves.map(function (moveNumber: string) {
						let mon: any = window['pokemon'][pokemon.pokedex_number];
						let move: any = window['moves'][moveNumber.toString()];
//            let damage: number = Math.ceil(.5 * ((pokemon.attack_iv + mon.BaseAttack) * (window['CpM'][pokemon.level * 2 - 1]) / 203.83091480000002) * move.Power)
            let damage: number = Math.ceil(.5 * ((pokemon.attack_iv + mon.BaseAttack) * (window['CpM'][79]) / 203.83091480000002) * move.Power);
						let givesStab: boolean = false;
						let dps: number = Number((damage / (move.DurationMs / 1000)).toFixed(2));
						let attacks_between_defends: number = Math.floor(1700 / move.DurationMs);
						let attacks_till_full_energy: number = Math.ceil(100 / (move.Energy * pokemon.stamina_adjust));
						let totalTime: number = (Math.floor(attacks_till_full_energy / attacks_between_defends) * 2) + ((attacks_till_full_energy % attacks_between_defends) * (move.DurationMs / 1000));

						if (move.Type.toLowerCase() === pokemon.type_1 || move.Type.toLowerCase() === pokemon.type_2) {

							givesStab = true;
							dps = Number((dps * 1.25).toFixed(2));
						}

            if (pokemon.move_1.toString() === moveNumber.toString()) {

              fast_dps = window['types_dict'].map(function (type: string) {

                let obj: any = {};

                obj[type] = dps * window['attack_matrix'][types[type]][types[move.Type]];

                return obj;
              });

              fast_tt = totalTime;
              fast_gym_tt = totalTime;
              fast_dps.avg = dps;
              fast_dps.gym = dps;
            }

						return new Move(
							move.Type.toLowerCase(),
							pokemon.move_1.toString() === moveNumber.toString(),
							dps,
							move.Name,
							givesStab,
							totalTime
						);
					}),
					charged: window['pokemon'][pokemon.pokedex_number].CinematicMoves.map(function (moveNumber: string) {
						let mon: any = window['pokemon'][pokemon.pokedex_number];
						let move: any = window['moves'][moveNumber.toString()];
//            let damage: number = Math.ceil(.5 * ((pokemon.attack_iv + mon.BaseAttack) * (window['CpM'][pokemon.level * 2 - 1]) / 203.83091480000002) * move.Power)
            let damage: number = Math.ceil(.5 * ((pokemon.attack_iv + mon.BaseAttack) * (window['CpM'][79]) / 203.83091480000002) * move.Power);
						let givesStab: boolean = false;
						let dps: number = Number((damage / (move.DurationMs / 1000)).toFixed(2));
						let totalTime: number = (Math.ceil(100 / move.Energy) * (move.DurationMs + 500)) / 1000;

						if (move.Type.toLowerCase() === pokemon.type_1 || move.Type.toLowerCase() === pokemon.type_2) {

							givesStab = true;
							dps = Number((dps * 1.25).toFixed(2));
						}

            if (pokemon.move_2.toString() === moveNumber.toString()) {

              charge_dps = window['types_dict'].map(function (type: string) {

                let obj: any = {};

                obj[type] = dps * window['attack_matrix'][types[type]][types[move.Type]];

                return obj;
              });

              charge_tt = totalTime;
              charge_gym_tt = Math.ceil(100 / move.Energy);
              charge_dps.avg = dps;
              charge_dps.gym = damage / 2;
            }

						return new Move(
							move.Type.toLowerCase(),
							pokemon.move_2.toString() === moveNumber.toString(),
							dps,
							move.Name,
							givesStab,
							totalTime
						);
					})
				};

        pokemon.dps = window['types_dict'].map(function (type: string) {

          let obj: any = {};

          obj[type] = Number((((fast_tt * fast_dps[types[type]]) + (charge_tt * charge_dps[types[type]])) / (fast_tt + charge_tt)).toFixed(2));

          return obj;
        });

        pokemon.dps.gym = Number((((fast_gym_tt * fast_dps.gym) + (charge_gym_tt * charge_dps.gym)) / (fast_gym_tt + charge_gym_tt)).toFixed(2));

        pokemon.dps.avg = Number((((fast_tt * fast_dps.avg) + (charge_tt * charge_dps.avg)) / (fast_tt + charge_tt)).toFixed(2));

				pokemon.moves.fast = pokemon.moves.fast.sort((a,b) => {
					if ( a.DPS < b.DPS ) return 1;
					if ( a.DPS > b.DPS) return -1;
					return 0;
				});

				pokemon.moves.charged = pokemon.moves.charged.sort((a,b) => {
					if ( a.DPS < b.DPS ) return 1;
					if ( a.DPS > b.DPS) return -1;
					return 0;
				});

				return pokemon;
			});

			this._species = resBody.species as Species[];
			this._userLogin.token = resBody.token;
		})
		.catch(this.handleError);
	}

	public transferPokemon(pokemon: Pokemon){
		let headers = new Headers({
			'Content-Type': 'application/json'});

		let request = {
			username: this._userLogin.username,
			password: this._userLogin.password,
			type: this._userLogin.type,
			token: this._userLogin.token,
			id: pokemon.id
		};

		return this._http
		.post(
			this._properties.apiHost + this._properties.transferPokemonRoute,
			JSON.stringify(request),
			{headers: headers}
		)
		.toPromise()
		.then(res => {
			this._userLogin.token = res.json().token;
		})
		.catch(this.handleError);
	}

	public renamePokemon(pokemon: Pokemon, nickname: string){
		let headers = new Headers({
			'Content-Type': 'application/json'});

		let request = {
			username: this._userLogin.username,
			password: this._userLogin.password,
			token: this._userLogin.token,
			type: this._userLogin.type,
			id: pokemon.id,
			nickname: nickname
		};

		return this._http
		.post(
			this._properties.apiHost + this._properties.renamePokemonRoute,
			JSON.stringify(request),
			{headers: headers}
		)
		.toPromise()
		.then(res => {
			this._userLogin.token = res.json().token;
		})
		.catch(this.handleError);
	}

	public toggleFavoritePokemon(pokemon: Pokemon) {
		let headers = new Headers({
			'Content-Type': 'application/json'});

		let request = {
			username: this._userLogin.username,
			password: this._userLogin.password,
			type: this._userLogin.type,
			token: this._userLogin.token,
			id: pokemon.id,
			favorite: !pokemon.favorite
		};

		return this._http
		.post(
			this._properties.apiHost + this._properties.favoritePokemonRoute,
			JSON.stringify(request),
			{headers: headers}
		)
		.toPromise()
		.then(res => {
			this._userLogin.token = res.json().token;
		})
		.catch(this.handleError);
	}

	private handleError(error: any) {
		console.error('An error occurred', error);
		return Promise.reject(error.message || error);
	}
}