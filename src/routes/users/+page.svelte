<script lang="ts">
    import { t } from 'svelte-i18n'
// @ts-nocheck

    import LeaderboardHeader from "$lib/LeaderboardHeader.svelte";
    import BackgroundRandomizer from "$lib/BackgroundRandomizer.svelte";
    import LeaderboardFooter from "$lib/LeaderboardFooter.svelte";
    import UserPageTrophy from '$lib/LeaderboardComponents/UserParts/UserPageTrophy.svelte';

    import { onMount } from "svelte";

    var d;
    var primaryNameOutput;
    var secondaryNameOutput;
    var cssOutput;
    var defaultDescription = '';

    var AlliancePosition = 'Member';

    var shipSrc;
    let regionNames = new Intl.DisplayNames(['en'], {type: 'region'});

    onMount(async () => {
    var params = window.location.search;
    const response = await fetch('/ngs-api/UserInfo' + params, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    d = await response.json();
    d = d[0];
    if(d == undefined || d.PlayerID == 106 || d.PlayerID == 107) {
        d = {'Error':1}
    }
    //console.log(d);
    generateNames();
    checkDescription();
    shipSrc = shipGenerate();
    flagGenerate();
    defaultDescription = `Streamer Mode is enabled. To view profile descriptions, disable Streamer Mode!`
});

function shipGenerate() {
        var smile = null;
        var serverref = d.Server.toLowerCase();
        if(serverref != 'global') {
				switch(serverref) {
					case 'jp':
						serverref = 'japan';
						break;
					case 'japan':
						break;
					case 'jpn':
						serverref = 'japan';
						break;
				}
			}
        if ((d.Ship != null && d.Ship != '') && (d.Server != null && d.Server != '')) {
			var iconref = 'ship' + d.Ship + '-' + serverref;
			smile = '/icons/ships/' + iconref + '.png';
		}
        d.Server = serverref.charAt(0).toUpperCase() + serverref.slice(1).toLowerCase();
        return smile;
    }

function checkDescription() {
    if (d.Description == null || d.Description == '') {
        d.Description = `We don't have a profile for ` + primaryNameOutput + `, but they're definitely cool!`
    }
}

function flagGenerate() {
		// If we do have a flag, go ahead and generate.
		if (d.Flag != null && d.Flag != '') {
			d.Country = regionNames.of(d.Flag.toUpperCase());
		}

    }

function generateNames() {
        switch (d.PreferredName) {
            // Main Character Name
            case 1:
                primaryNameOutput = d.CharacterName;
                secondaryNameOutput = d.PlayerName;
                break;
            // Run Character Name
            case 2:
                primaryNameOutput = d.CharacterName;
                secondaryNameOutput = d.PlayerName;
                break;
            // Player Name
            default:
                primaryNameOutput = d.PlayerName;
                secondaryNameOutput = d.CharacterName;
                break;
        }
        if (primaryNameOutput == null || primaryNameOutput == '') {
            primaryNameOutput = secondaryNameOutput;
        }

        if (d.PlayerID != (106 || 107)) {
            cssOutput = ``;
            switch (d.NameType) {
            case 1:
                cssOutput += `color: #` + d.NameColor1 + `;`
                break;
            case 2:
                cssOutput += `background: -webkit-linear-gradient(0deg, #` + d.NameColor1 + `, #` + d.NameColor2 + `);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;`;
                break;
            case 3:
                cssOutput += `color: #` + d.NameColor2 + `; text-shadow: 0px 0px 5px #` + d.NameColor1 + `, 0px 0px 5px #` + d.NameColor1 + `, 0px 0px 5px #` + d.NameColor1 + `;`;
                break;
            default:
                break;
            }
        }
        else {
            cssOutput = ``;
        }

    }
    
</script>

<svelte:head>
    {#if primaryNameOutput !== undefined}
    <title>{$t('shared.siteName')} | ARKs ID: {primaryNameOutput}</title>
    {:else}
    <title>{$t('shared.siteName')} | ARKs ID</title>
    {/if}
</svelte:head>

<div class="flex flex-col min-h-screen">
    <LeaderboardHeader/>

    <div class="flex flex-col grow content-center">
        <div class="container flex grow mx-auto bg-base-100/75 border-secondary border rounded-md m-16">
            <div class="flex flex-col grow bg-base-100 m-2 px-8 p-4 border-secondary border rounded-md gap-1">
                <div class="text-4xl font-light text-center">ARKS ID</div>
                <div class="divider -mx-8"></div>
                {#if d !== undefined && !d.Error}
                <div class="flex flex-col md:flex-row bg-secondary/25 border border-secondary rounded-md p-2">
                    <div class="avatar mr-2 place-self-center md:place-self-auto">
                        <div class="w-32 rounded">
                            {#if d.Avatar && d.AvatarBan != '1' && ((localStorage.getItem("user-streamermode") ?? 'false') === 'false')}
                                <img src={d.Avatar} />
                            {:else if d.Avatar && d.AvatarBan == '1' && ((localStorage.getItem("user-streamermode") ?? 'false') === 'false')}
                                <img src='/system/avatar-punishment.png' />
                            {:else}
                                <img src='/system/avatar-none.png' />
                            {/if}
                        </div>
                    </div>
                    <div class="flex flex-col basis-full place-items-center md:place-items-start mt-1 md:mt-0">
                        <span class="flex font-bold text-2xl md:text-4xl w-[70vw] md:w-auto justify-center md:justify-start"><span style={cssOutput}>{primaryNameOutput}</span></span>
                        {#if d.AllianceID || d.Twitch || d.Youtube || d.Youtube2 || d.Twitter || d.Discord}
                        <div class="divider my-0 mb-auto"></div>
                        {:else}
                        <div class="divider my-0 mt-0"></div>
                        {/if}
                        <div class="flex flex-col md:flex-row place-self-stretch flex-wrap">
                            <div class="place-items-center flex flex-col md:flex-row">
                                {#if secondaryNameOutput !== null && secondaryNameOutput !== ''}
                                {#if d.PreferredName == 1 || d.PreferredName == 2}
                                <span>Player Name:</span>
                                {:else}
                                <span>Character Name:</span>
                                {/if}
                                <span class="ml-0 md:ml-1">{secondaryNameOutput}</span>
                                <span class="mx-2 text-base-content/50">???</span>
                                {/if}
                                {#if d.Ship != null && d.Ship != ''}<img src={shipSrc} class="mr-0 md:mr-1 inline object-center object-none" alt="Ship {d.Ship} - {d.Server}">Ship {d.Ship} - {:else}<img class="mr-0 md:mr-1 inline object-center object-none" src="/icons/server/server-{d.Server.toLowerCase()}.png" alt={d.Server}>{/if}{d.Server}
                                {#if d.Flag != null && d.Flag != ''}
                                <span class="mx-2 text-base-content/50">???</span>
                                <span class="fi fi-{d.Flag} mr-0 md:mr-1" style="max-height:16px;min-width: 25px;"></span>
                                {d.Country}
                                {/if}
                            </div>
                        </div>
                        {#if d.AllianceID || d.Twitch || d.Youtube || d.Youtube2 || d.Twitter || d.Discord}
                        <div class="divider my-0 mt-auto"></div>
                        {/if}
                        
                        <div class="flex flex-col md:flex-row place-self-stretch flex-wrap">
                            {#if d.AllianceID}
                                {#if d.AllianceIcon}
                                    <img class="h-8 w-8 md:h-6 md:w-6 rounded mr-0 md:mr-1 place-self-center" src={d.AllianceIcon} />
                                {/if}
                                <span class="font-semibold place-self-center">{d.AllianceName}</span>
                                <span class="mx-1 hidden md:inline place-self-center">-</span>
                                <span class="place-self-center">{AlliancePosition}</span>
                            
                            <div class="divider my-0 mt-auto"></div>
                            {/if}
                            <div class="flex flex-row justify-center ml-0 md:ml-auto gap-1 flex-wrap">
                                {#if d.Twitch != null && d.Twitch != ''}
                                <a href="https://twitch.tv/{d.Twitch}" target="_blank" rel="noreferrer noopener"><span class="rounded badge badge-lg md:badge-md border-0 text-white bg-[#803be5] hover:brightness-75 font-semibold"><i class="bi bi-twitch mr-1"></i>Twitch</span></a>
                                {/if}
                                {#if d.Youtube != null && d.Youtube != ''}
                                <a href="https://youtube.com/@{d.Youtube}" target="_blank" rel="noreferrer noopener"><span class="rounded badge badge-lg md:badge-md border-0 text-white bg-[#d11414] hover:brightness-75 font-semibold"><i class="bi bi-youtube mr-1"></i>Youtube</span></a>
                                {/if}
                                {#if d.Youtube2 != null && d.Youtube2 != ''}
                                <a href="https://youtube.com/@{d.Youtube2}" target="_blank" rel="noreferrer noopener"><span class="rounded badge badge-lg md:badge-md border-0 text-white bg-[#d11414] hover:brightness-75 font-semibold"><i class="bi bi-youtube mr-1"></i>2nd Youtube</span></a>
                                {/if}
                                {#if d.Twitter != null && d.Twitter != ''}
                                <a href="https://twitter.com/{d.Twitter}" target="_blank" rel="noreferrer noopener"><span class="rounded badge badge-lg md:badge-md border-0 text-white bg-[#1D9BF9] hover:brightness-75 font-semibold"><i class="bi bi-twitter mr-1"></i>Twitter</span></a>
                                {/if}
                                {#if d.Discord != null && d.Discord != ''}
                                <div class="tooltip" data-tip="{d.Discord}"><span style="cursor: pointer;"class="rounded badge badge-lg md:badge-md border-0 text-white bg-[#5865f2] hover:brightness-75 font-semibold"><i class="bi bi-discord mr-1"></i>Discord</span></div>
                                {/if}
                            </div>
                        </div>
                        
                    </div>
                </div>
                <div class="flex justify-center bg-secondary/25 border border-secondary rounded-md p-2 grow">
                    <div class="flex flex-col grow">
                        <span class="font-semibold text-lg text-center">Profile:</span>
                        {#if (localStorage.getItem("user-streamermode") ?? 'false') === 'false'}
                        <div class="whitespace-pre-wrap p-2 text-sm md:text-base">{d.Description}</div>
                        {:else}
                        <div class="whitespace-pre-wrap p-2 text-sm md:text-base">{defaultDescription}</div>
                        {/if}
                    </div>
                </div>
                {#if d.Trophies}
                <div class="flex justify-center bg-secondary/25 border border-secondary rounded-md p-2">
                    <div class="flex flex-col grow">
                        <span class="font-semibold text-lg text-center">Trophies:</span>
                        <div class="p-2 flex flex-row flex-wrap grow justify-center gap-8">
                            {#each d.Trophies as trophies}

                            <UserPageTrophy trophyReference={trophies}/>

                            {/each}
                        </div>
                    </div>
                </div>
                {/if}
                {:else if d !== undefined && d.Error}
                <div class="flex flex-col basis-full place-content-center place-items-center gap-1">User Not Found</div>
                {:else}
                <div class="flex flex-col basis-full place-content-center place-items-center gap-1">Loading - Please Wait...<br><progress class="progress border border-neutral-content/20 progress-primary w-56"></progress></div>
                {/if}
            </div>
        </div>
    </div>
    <LeaderboardFooter/>
</div>

<BackgroundRandomizer/>